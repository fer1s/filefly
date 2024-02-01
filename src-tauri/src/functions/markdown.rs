use markdown::to_html;

#[tauri::command]
pub fn md_to_html(path: String) -> String {
    // Check if path exists and is a file
    if std::path::Path::new(&path).exists() && std::path::Path::new(&path).is_file() {
        // Read file and convert to html
        let file = std::fs::read_to_string(&path).unwrap();
        let html = to_html(&file);

        return html;
    } else {
        return "Error: File not found".to_string();
    }
}