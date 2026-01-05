use hound::{WavSpec, WavWriter};
use std::{fs::File, path::Path};
use symphonia::core::errors::Error;
use symphonia::{
    core::{codecs::CODEC_TYPE_NULL, io::MediaSourceStream, probe::Hint},
    default::get_probe,
};

pub mod effects;
use effects::{AudioEffect, BitCrusher, SimpleDelay};

fn main() {
    let path = Path::new("./music.mp3");
    let output_path = Path::new("./output.wav");

    let mut pipeline: Vec<Box<dyn AudioEffect>> = vec![
        Box::new(BitCrusher { bits: 8 }), // Reduces quality to 8-bit
        Box::new(SimpleDelay::new(22050, 0.4, 0.5)), // 0.5s delay (at 44.1kHz)
    ];

    println!("Starting audio processing...");

    if let Err(e) = decode_audio_file(path, output_path, &mut pipeline) {
        eprintln!("Error processing audio: {}", e);
    }
}

fn decode_audio_file(
    file_path: &Path,
    output_path: &Path,
    pipeline: &mut Vec<Box<dyn AudioEffect>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let file = Box::new(File::open(file_path)?);
    let mss = MediaSourceStream::new(file, Default::default());

    let mut hint = Hint::new();
    hint.with_extension("mp3");

    let probed = get_probe().format(&hint, mss, &Default::default(), &Default::default())?;
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
