use serde::Serialize;
use std::time::SystemTime;
use jwalk::WalkDir;

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
    path: String,
    size: u64,
    metadata: DirMetadata,
}

#[tauri::command]
pub fn read_directory(path: &str) -> Vec<DirEntry> {
    let mut result: Vec<DirEntry> = Vec::new();

    // Use jwalk to walk through the dir
    for entry in WalkDir::new(path).into_iter().filter_map(Result::ok) {
        let file_name = entry.file_name();
        let metadata = entry.metadata().unwrap();

        let dirmetadata = DirMetadata {
            is_dir: metadata.is_dir(),
            is_file: metadata.is_file(),
            modified: metadata.modified().unwrap(),
            accessed: metadata.accessed().unwrap(),
            created: metadata.created().unwrap(),
        };

        let path_str = entry.path().to_string_lossy().to_string();

        result.push(DirEntry {
            name: file_name.to_string_lossy().to_string(), // File name
            path: path_str, // File path
            size: metadata.len(), // Call len() method to get file size,
            metadata: dirmetadata, // File metadata
        });
    }

    // Remove the first object from the vector if it is not empty
    if !result.is_empty() {
        result.remove(0);
    }

    result
}