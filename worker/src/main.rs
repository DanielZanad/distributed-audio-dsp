use dotenv::dotenv;
use futures_lite::stream::StreamExt;
use lapin::options::BasicConsumeOptions;
use lapin::types::FieldTable;
use lapin::{Connection, ConnectionProperties};
use std::path::Path;

mod lib;

use crate::lib::audio_processor::decode_audio_file;
use crate::lib::effects::AudioJob;
use crate::lib::storage::{JobStatusMessage, persist_output};

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

                let stored_output = match persist_output(output_path, output_path).await {
                    Ok(result) => result,
                    Err(e) => {
                        eprintln!("Error persisting processed audio: {}", e);
                        delivery
                            .nack(lapin::options::BasicNackOptions::default())
                            .await?;
                        continue;
                    }
                };

                let status_update = JobStatusMessage {
                    job_id: job.job_id,
                    status: "completed".to_string(),
                    output_key: stored_output.output_key,
                    output_url: stored_output.output_url,
                    output_size_bytes: stored_output.output_size_bytes,
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
