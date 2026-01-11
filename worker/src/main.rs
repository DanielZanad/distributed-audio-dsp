use futures_lite::stream::StreamExt;
use hound::{WavSpec, WavWriter};
use lapin::options::BasicConsumeOptions;
use lapin::types::FieldTable;
use lapin::{Connection, ConnectionProperties};
use std::{fs::File, path::Path};
use symphonia::core::errors::Error;
use symphonia::{
    core::{codecs::CODEC_TYPE_NULL, io::MediaSourceStream, probe::Hint},
    default::get_probe,
};

pub mod effects;
use effects::{AudioEffect, BitCrusher, SimpleDelay};

use crate::effects::{AudioJob, EffectConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
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

        let input = Path::new(&job.input_path);
        let output = Path::new(&job.output_path);

        if let Err(e) = decode_audio_file(input, output, job.effects) {
            eprintln!("Error processing audio: {}", e);
            delivery
                .nack(lapin::options::BasicNackOptions::default())
                .await?;
        } else {
            delivery
                .ack(lapin::options::BasicAckOptions::default())
                .await?;
        }
    }

    Ok(())
}

fn decode_audio_file(
    file_path: &Path,
    output_path: &Path,
    effects_config: Vec<EffectConfig>,
) -> Result<(), Box<dyn std::error::Error>> {
    let file = Box::new(File::open(file_path)?);
    let mss = MediaSourceStream::new(file, Default::default());

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
            Err(err) => return Err(Box::new(err)),
        };
    }

    writer.finalize()?;
    println!("Processing complete: {:?}", output_path);
    Ok(())
}
