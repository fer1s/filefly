use markdown::to_html;

// Render a markdown *string* to HTML. Takes the content (not a path) so the in-app preview can
// render unsaved edits held in the editor, not just what's on disk.
#[tauri::command]
pub fn md_render(content: String) -> String {
    to_html(&content)
}

// Read a text file's raw contents (the markdown source for the editor). Returns the error string
// on failure so the UI can surface it instead of panicking.
#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

// Overwrite a text file with `content` (Cmd+S from the markdown editor). Errors bubble up to the UI.
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}
