use dotenv::dotenv;
use futures_lite::stream::StreamExt;
use lapin::options::BasicConsumeOptions;
use lapin::types::FieldTable;
use lapin::{Connection, ConnectionProperties};
use std::path::Path;

mod lib;

use crate::lib::audio_processor::decode_audio_file;
use crate::lib::cloudflare::{JobStatusMessage, generate_presigned_url, get_client, upload_to_r2};
use crate::lib::effects::AudioJob;

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
