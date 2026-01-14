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
