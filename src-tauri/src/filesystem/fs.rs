use serde::Serialize;
use std::{fs};
use std::path::PathBuf;
use std::time::SystemTime;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirMetadata {
    is_dir: bool,
    is_file: bool,
    modified: SystemTime,
    accessed: SystemTime,
    created: SystemTime,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    name: String,
    path: PathBuf,
    size: u64,
    metadata: DirMetadata,
}

#[tauri::command]
pub fn read_directory(path: &str) -> Vec<DirEntry> {
    let mut result: Vec<DirEntry> = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let file_name = entry.file_name();
                let metadata = entry.metadata().unwrap();
                let path = entry.path();

                let dirmetadata = DirMetadata {
                    is_dir: metadata.is_dir(),
                    is_file: metadata.is_file(),
                    modified: metadata.modified().unwrap(),
                    accessed: metadata.accessed().unwrap(),
                    created: metadata.created().unwrap(),
                };

                result.push(DirEntry {
                    name: file_name.to_str().unwrap().to_string(),
                    path,
                    size: metadata.len(),
                    metadata: dirmetadata,
                });
            }
        }
    };

    result
}
