use aws_config::{BehaviorVersion, Region};
use aws_sdk_s3::config::{Builder, Credentials, RequestChecksumCalculation};
use aws_sdk_s3::primitives::ByteStream;

use std::path::Path;
use std::time::Duration;

use aws_sdk_s3::presigning::PresigningConfig;
use serde::Serialize;

#[derive(Serialize)]
pub struct JobStatusMessage {
    pub job_id: String,
    pub status: String,
    pub output_url: String,
}

pub async fn generate_presigned_url(
    client: &aws_sdk_s3::Client,
    bucket: &str,
    key: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let expires_in = Duration::from_secs(3600 * 2);

    let presigned_url = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .presigned(PresigningConfig::expires_in(expires_in)?)
        .await?;

    Ok(presigned_url.uri().to_string())
}

pub async fn upload_to_r2(
    file_path: &Path,
    bucket_name: &str,
    object_key: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let body = ByteStream::from_path(file_path)
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

    let client = get_client().await?;

    client
        .put_object()
        .bucket(bucket_name)
        .key(object_key)
        .body(body)
        .content_type("audio/wav")
        .send()
        .await
        .map_err(|e| e.into_service_error())?;

    println!("Successfully uploaded {} to R2", object_key);
    Ok(())
}

pub async fn get_client() -> Result<aws_sdk_s3::Client, Box<dyn std::error::Error>> {
    let endpoint_url = std::env::var("CLOUDFLARE_ENDPOINT").expect("ENDPOINT missing");
    let access_key = std::env::var("CLOUDFLARE_ACCESS_KEY_ID").expect("ACCESS_KEY_ID missing");
    let secret_key =
        std::env::var("CLOUDFLARE_SECRET_ACCESS_KEY").expect("SECRET_ACCESS_KEY missing");

    let config = Builder::new()
        .behavior_version(BehaviorVersion::latest())
        .region(Region::new("auto"))
        .endpoint_url(endpoint_url)
        .credentials_provider(Credentials::new(access_key, secret_key, None, None, "R2"))
        .request_checksum_calculation(RequestChecksumCalculation::WhenRequired)
        .force_path_style(true)
        .build();

    let client = aws_sdk_s3::Client::from_conf(config);
    Ok(client)
}
