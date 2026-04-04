use serde::Serialize;
use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};

use crate::lib::cloudflare::upload_to_r2;

const DEFAULT_LOCAL_STORAGE_ROOT: &str = "/app/data";

#[derive(Serialize)]
pub struct JobStatusMessage {
    pub job_id: String,
    pub status: String,
    pub output_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_url: Option<String>,
    pub output_size_bytes: u64,
}

pub struct StorageResult {
    pub output_key: String,
    pub output_url: Option<String>,
    pub output_size_bytes: u64,
}

enum StorageDriver {
    Local,
    R2,
}

impl StorageDriver {
    fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let raw = std::env::var("AUDIO_STORAGE_DRIVER").unwrap_or_else(|_| "r2".into());

        match raw.trim().to_lowercase().as_str() {
            "local" => Ok(Self::Local),
            "r2" => Ok(Self::R2),
            value => Err(format!("unsupported AUDIO_STORAGE_DRIVER: {value}").into()),
        }
    }
}

pub async fn persist_output(
    temp_file_path: &Path,
    desired_output_path: &Path,
) -> Result<StorageResult, Box<dyn std::error::Error>> {
    let storage_root =
        std::env::var("LOCAL_AUDIO_STORAGE_ROOT").unwrap_or_else(|_| DEFAULT_LOCAL_STORAGE_ROOT.into());
    let storage_root = Path::new(&storage_root);

    match StorageDriver::from_env()? {
        StorageDriver::Local => persist_locally(temp_file_path, desired_output_path, storage_root),
        StorageDriver::R2 => persist_to_r2_with_local_fallback(
            temp_file_path,
            desired_output_path,
            storage_root,
        )
        .await,
    }
}

fn persist_locally(
    temp_file_path: &Path,
    desired_output_path: &Path,
    storage_root: &Path,
) -> Result<StorageResult, Box<dyn std::error::Error>> {
    let output_key = sanitize_relative_path(desired_output_path)?;
    let destination = storage_root.join(&output_key);

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }

    if destination.exists() {
        fs::remove_file(&destination)?;
    }

    match fs::rename(temp_file_path, &destination) {
        Ok(_) => {}
        Err(error) if is_cross_device_error(&error) => {
            fs::copy(temp_file_path, &destination)?;
            fs::remove_file(temp_file_path)?;
        }
        Err(error) => return Err(Box::new(error)),
    }

    let output_size_bytes = fs::metadata(&destination)?.len();

    Ok(StorageResult {
        output_key,
        output_url: None,
        output_size_bytes,
    })
}

async fn persist_to_r2_with_local_fallback(
    temp_file_path: &Path,
    desired_output_path: &Path,
    storage_root: &Path,
) -> Result<StorageResult, Box<dyn std::error::Error>> {
    let local_result = persist_locally(temp_file_path, desired_output_path, storage_root)?;
    let bucket = std::env::var("R2_BUCKET_NAME").unwrap_or_else(|_| "processed-audio".into());
    let local_output_path = storage_root.join(&local_result.output_key);

    upload_to_r2(&local_output_path, &bucket, &local_result.output_key).await?;

    Ok(local_result)
}

fn sanitize_relative_path(path: &Path) -> Result<String, Box<dyn std::error::Error>> {
    let mut normalized = PathBuf::new();

    for component in path.components() {
        match component {
            Component::Normal(part) => normalized.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(format!("invalid output path: {}", path.display()).into());
            }
        }
    }

    if normalized.as_os_str().is_empty() {
        return Err("output path cannot be empty".into());
    }

    Ok(normalized.to_string_lossy().replace('\\', "/"))
}

fn is_cross_device_error(error: &io::Error) -> bool {
    error.raw_os_error() == Some(18)
}

#[cfg(test)]
mod tests {
    use super::{persist_locally, sanitize_relative_path};
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_temp_dir(name: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time should be monotonic")
            .as_nanos();

        std::env::temp_dir().join(format!("worker-storage-{name}-{nanos}"))
    }

    #[test]
    fn rejects_path_traversal() {
        let path = Path::new("../escape.wav");

        let error = sanitize_relative_path(path).expect_err("path should be rejected");

        assert!(error.to_string().contains("invalid output path"));
    }

    #[test]
    fn persists_processed_file_locally() {
        let base_dir = unique_temp_dir("local");
        let temp_dir = base_dir.join("tmp");
        let storage_dir = base_dir.join("storage");
        let temp_file = temp_dir.join("processed").join("job-1.wav");
        let desired_output_path = Path::new("processed/job-1.wav");

        fs::create_dir_all(temp_file.parent().expect("temp parent should exist"))
            .expect("temp dir should be created");
        fs::write(&temp_file, b"wave-data").expect("temp file should be written");

        let result = persist_locally(&temp_file, desired_output_path, &storage_dir)
            .expect("file should be stored locally");

        assert_eq!(result.output_key, "processed/job-1.wav");
        assert_eq!(result.output_size_bytes, 9);
        assert!(result.output_url.is_none());
        assert!(!temp_file.exists());
        assert!(storage_dir.join("processed/job-1.wav").exists());

        let _ = fs::remove_dir_all(base_dir);
    }
}
