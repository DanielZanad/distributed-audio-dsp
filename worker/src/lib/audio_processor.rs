use hound::{WavSpec, WavWriter};
use indicatif::{ProgressBar, ProgressStyle};
use std::io::Cursor;
use std::path::Path;
use symphonia::core::codecs::CODEC_TYPE_NULL;
use symphonia::core::errors::Error;
use symphonia::core::io::MediaSourceStream;
use symphonia::default::get_probe;

use crate::lib::effects::{AudioEffect, EffectConfig};

pub async fn decode_audio_file(
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
