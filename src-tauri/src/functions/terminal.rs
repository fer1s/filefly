use std::error::Error;
use std::path::Path;
use std::process::Command;

// Open a terminal window in provided path
fn open_terminal(path: &str) -> Result<(), Box<dyn Error>> {
    let mut command = Command::new("cmd");
    command
        .args(&["/C", "start", "cmd.exe", "/K", "cd"])
        .current_dir(path)
        .spawn()?;
    Ok(())
}

#[tauri::command]
pub fn open_in_terminal(path: String) {
    let path = Path::new(&path);
    if !path.exists() {
        return;
    }

    if path.is_dir() {
        open_terminal(path.to_str().unwrap()).unwrap();
    } else {
        open_terminal(path.parent().unwrap().to_str().unwrap()).unwrap();
    }
}
