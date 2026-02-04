use dotenv::dotenv;
use futures_lite::stream::StreamExt;
use hound::{WavSpec, WavWriter};
use indicatif::{ProgressBar, ProgressStyle};
use lapin::options::BasicConsumeOptions;
use lapin::types::FieldTable;
use lapin::{Connection, ConnectionProperties};
use std::{io::Cursor, path::Path};
use symphonia::core::errors::Error;
use symphonia::{
    core::{codecs::CODEC_TYPE_NULL, io::MediaSourceStream},
    default::get_probe,
};

mod lib;

use crate::lib::cloudflare::{JobStatusMessage, generate_presigned_url, get_client, upload_to_r2};
use crate::lib::effects::{AudioJob, EffectConfig};
use lib::effects::AudioEffect;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    println!("Starting worker...");

    let processed_dir = Path::new("processed");
    if processed_dir.exists() {
        println!("Cleaning up old processed files...");
        std::fs::remove_dir_all(processed_dir)?;
    }
    std::fs::create_dir_all(processed_dir)?;

    let addr = std::env::var("RABBITMQ_URL").unwrap_or_else(|_| "amqp://127.0.0.1:5672/%2f".into());

    let conn = Connection::connect(&addr, ConnectionProperties::default())
        .await
        .expect("Failed to connect to RabbitMQ");

    let channel = conn
        .create_channel()
        .await
        .expect("Failed to open a channel");

    println!(" [*] Waiting for messages. To exit press CTRL+C");

    let mut consumer = channel
        .basic_consume(
            "audio_jobs",
            "rust_worker",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    println!("Starting audio processing...");

    while let Some(delivery) = consumer.next().await {
        let delivery = delivery.expect("error in consumer");
        let data = std::str::from_utf8(&delivery.data)?;

        let job: AudioJob = serde_json::from_str(data)?;
        println!("Received job: {:?}", job);

        let input = &job.input_path;
        let output_path = Path::new(&job.output_path);

        match decode_audio_file(input, output_path, job.effects).await {
            Ok(_) => {
                println!("Processing succeeded");
                let bucket =
                    std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "processed-audio".into());
                let key = output_path.file_name().unwrap().to_str().unwrap();

                if let Err(e) = upload_to_r2(output_path, &bucket, key).await {
                    eprintln!("Error uploading to R2: {}", e);
                    delivery
                        .nack(lapin::options::BasicNackOptions::default())
                        .await?;
                } else {
                    let s3_client = get_client().await?;

                    let output_url = generate_presigned_url(&s3_client, &bucket, key).await?;

                    let status_update = JobStatusMessage {
                        job_id: job.job_id,
                        status: "completed".to_string(),
                        output_url,
                    };

                    let payload = serde_json::to_vec(&status_update)?;
                    channel
                        .basic_publish(
                            "",
                            "audio_status",
                            lapin::options::BasicPublishOptions::default(),
                            &payload,
                            lapin::BasicProperties::default(),
                        )
                        .await?;

                    delivery
                        .ack(lapin::options::BasicAckOptions::default())
                        .await?;

                    // delete local file after upload
                    let _ = std::fs::remove_file(output_path);
                }
            }
            Err(e) => {
                eprintln!("Error processing audio: {}", e);
                delivery
                    .nack(lapin::options::BasicNackOptions::default())
                    .await?;
            }
        }
    }

    Ok(())
}

async fn decode_audio_file(
    file_path: &str,
    output_path: &Path,
    effects_config: Vec<EffectConfig>,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let response = reqwest::get(file_path).await?;
    if !response.status().is_success() {
        return Err(format!("failed to fetch audio: {}", response.status()).into());
    }

    let bytes = response.bytes().await?;
    let cursor = Cursor::new(bytes);

    let mss = MediaSourceStream::new(Box::new(cursor), Default::default());

    let probed = get_probe().format(
        &Default::default(),
        mss,
        &Default::default(),
        &Default::default(),
    )?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .expect("not supported audio tracks");

    let total_frames = track.codec_params.n_frames;
    let pb = match total_frames {
        Some(total) => {
            let p = ProgressBar::new(total);
            p.set_style(ProgressStyle::default_bar()
                .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} frames ({eta})")?
                .progress_chars("#>-"));
            p
        }
        None => ProgressBar::new_spinner(),
    };

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &Default::default())
        .expect("Unsupported codec");

    let track_id = track.id;

    // Use metadata for WavSpec
    let spec = track.codec_params.clone();
    let wav_spec = WavSpec {
        channels: spec.channels.map(|c| c.count() as u16).unwrap_or(2),
        sample_rate: spec.sample_rate.unwrap_or(44100),
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };
    let mut writer = WavWriter::create(output_path, wav_spec)?;

    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);

    let mut pipeline: Vec<Box<dyn AudioEffect>> = effects_config
        .into_iter()
        .map(|c| c.into_effect(sample_rate as usize))
        .collect();

    loop {
        match format.next_packet() {
            Ok(packet) => {
                if packet.track_id() != track_id {
                    continue;
                }

                match decoder.decode(&packet) {
                    Ok(decoded) => {
                        pb.inc(decoded.capacity() as u64);
                        let mut sample_buf = symphonia::core::audio::SampleBuffer::<f32>::new(
                            decoded.capacity() as u64,
                            *decoded.spec(),
                        );

                        sample_buf.copy_interleaved_ref(decoded);
                        let samples = sample_buf.samples_mut();

                        // Apply effect
                        for effect in pipeline.iter_mut() {
                            effect.process(samples);
                        }

                        for &sample in samples.iter() {
                            writer.write_sample(sample)?;
                        }
                    }
                    Err(Error::IoError(_)) => continue,
                    Err(err) => return Err(Box::new(err)),
                }
            }
            Err(Error::ResetRequired) => break,
            Err(_) => return Ok(()),
        };
    }

    writer.finalize()?;
    pb.finish_with_message("Done!");
    println!("Processing complete: {:?}", output_path);
    Ok(())
}
