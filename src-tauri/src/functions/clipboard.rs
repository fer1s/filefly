//! Write files to the system clipboard the Finder way: a single copy carries several pasteboard
//! "flavors" at once, so each receiver takes what it understands. A file-aware app (Finder, Mail)
//! reads the `public.file-url` flavor and copies the actual file; a plain text field reads the
//! `public.utf8-plain-text` flavor and gets the file's name (+ ext). Same clipboard, different
//! reader, different result — which is why pasting a copied file into a text box yields its name.
//!
//! macOS builds the real multi-flavor NSPasteboard. Other platforms have no equivalent file-URL
//! flavor exposed cross-platform, so they fall back to copying the names as plain text.

// The trailing name (with extension) of a path — the "name" flavor Finder puts on the pasteboard.
fn basename(path: &str) -> String {
    std::path::Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string())
}

// Copy the given entries to the OS clipboard with both a file-URL and a plain-text (name) flavor,
// so they paste as files into file-aware apps and as names into text fields. Remote (sftp://…)
// entries have no local file URL — they still contribute their name as text.
#[tauri::command]
pub fn copy_files_to_clipboard(paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        use objc2::rc::Retained;
        use objc2::runtime::ProtocolObject;
        use objc2_app_kit::{
            NSPasteboard, NSPasteboardItem, NSPasteboardTypeFileURL, NSPasteboardTypeString,
            NSPasteboardWriting,
        };
        use objc2_foundation::{NSArray, NSString, NSURL};

        let is_local = |p: &str| !p.contains("://");

        // One pasteboard item per file, each offering its own file-url + name. A text field pasting
        // a multi-item pasteboard joins the string flavors with newlines (one name per line).
        let ok = unsafe {
            let mut items: Vec<Retained<ProtocolObject<dyn NSPasteboardWriting>>> =
                Vec::with_capacity(paths.len());
            for path in &paths {
                let item = NSPasteboardItem::new();
                if is_local(path) {
                    let url = NSURL::fileURLWithPath(&NSString::from_str(path));
                    if let Some(url_string) = url.absoluteString() {
                        item.setString_forType(&url_string, NSPasteboardTypeFileURL);
                    }
                }
                item.setString_forType(&NSString::from_str(&basename(path)), NSPasteboardTypeString);
                items.push(ProtocolObject::from_retained(item));
            }

            let array = NSArray::from_retained_slice(&items);
            let pasteboard = NSPasteboard::generalPasteboard();
            pasteboard.clearContents();
            pasteboard.writeObjects(&array)
        };

        if ok {
            Ok(())
        } else {
            Err("The system rejected the clipboard write".to_string())
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let names = paths
            .iter()
            .map(|p| basename(p))
            .collect::<Vec<_>>()
            .join("\n");
        let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
        clipboard.set_text(names).map_err(|e| e.to_string())
    }
}
