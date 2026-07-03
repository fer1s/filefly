//! macOS "default folder handler" toggle. Makes this app the handler Launch Services uses to *open*
//! a directory — `open <dir>` from Terminal, folder links in other apps, aliases — or restores
//! Finder. Reversible: toggling off sets the handler back to `com.apple.finder`.
//!
//! IMPORTANT: this does NOT change double-clicking a folder inside Finder. Finder navigates those
//! itself and macOS exposes no hook to redirect it. The toggle only affects the system-wide
//! "open this directory" route that goes through Launch Services.
//!
//! For the app to actually receive the opened folder, two more pieces are needed (both in place):
//!   * it declares it handles `public.folder` (CFBundleDocumentTypes in Info.plist), and
//!   * it handles `RunEvent::Opened` in main.rs to open a window at the path.

use tauri::AppHandle;

// Launch Services / CoreFoundation FFI. These functions are the documented way to read and set the
// default handler for a content type; deprecated since macOS 12 but still functional and the only
// public API for it.
#[cfg(target_os = "macos")]
mod ls {
    use std::os::raw::c_void;

    pub type CFStringRef = *const c_void;
    pub type OSStatus = i32;

    // kLSRolesAll — set/query the handler across every role (viewer, editor, shell).
    pub const LS_ROLES_ALL: u32 = 0xFFFF_FFFF;

    #[link(name = "CoreServices", kind = "framework")]
    extern "C" {
        pub fn LSCopyDefaultRoleHandlerForContentType(
            in_content_type: CFStringRef,
            in_role: u32,
        ) -> CFStringRef;
        pub fn LSSetDefaultRoleHandlerForContentType(
            in_content_type: CFStringRef,
            in_role: u32,
            in_handler_bundle_id: CFStringRef,
        ) -> OSStatus;
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        pub fn CFRelease(cf: *const c_void);
    }
}

// The UTI for a plain folder. Packages (.app, .rtfd, …) conform to com.apple.package, not this, so
// claiming it does not hijack bundle directories.
#[cfg(target_os = "macos")]
const FOLDER_UTI: &str = "public.folder";

// NSString is toll-free bridged to CFString, so its pointer is a valid CFStringRef.
#[cfg(target_os = "macos")]
fn as_cf(string: &objc2_foundation::NSString) -> ls::CFStringRef {
    (string as *const objc2_foundation::NSString).cast()
}

// The bundle id currently registered to open folders (lowercased), or None if unset.
#[cfg(target_os = "macos")]
fn current_folder_handler() -> Option<String> {
    use objc2_foundation::NSString;
    let content_type = NSString::from_str(FOLDER_UTI);
    unsafe {
        let handler = ls::LSCopyDefaultRoleHandlerForContentType(as_cf(&content_type), ls::LS_ROLES_ALL);
        if handler.is_null() {
            return None;
        }
        let value = (*(handler as *const NSString)).to_string();
        ls::CFRelease(handler as *const _);
        Some(value.to_lowercase())
    }
}

// Whether this app is currently the default handler for opening folders.
#[tauri::command]
pub fn is_default_folder_handler(app: AppHandle) -> bool {
    #[cfg(target_os = "macos")]
    {
        let ours = app.config().identifier.to_lowercase();
        current_folder_handler().map(|h| h == ours).unwrap_or(false)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        false
    }
}

// Make this app the default folder handler (enable), or restore Finder (disable). macOS only.
#[tauri::command]
pub fn set_default_folder_handler(app: AppHandle, enable: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use objc2_foundation::NSString;
        let bundle_id = if enable {
            app.config().identifier.clone()
        } else {
            "com.apple.finder".to_string()
        };
        let content_type = NSString::from_str(FOLDER_UTI);
        let handler = NSString::from_str(&bundle_id);
        let status = unsafe {
            ls::LSSetDefaultRoleHandlerForContentType(
                as_cf(&content_type),
                ls::LS_ROLES_ALL,
                as_cf(&handler),
            )
        };
        if status == 0 {
            Ok(())
        } else {
            Err(format!("Launch Services rejected the change (OSStatus {status})"))
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, enable);
        Err("Default folder handler is a macOS-only feature.".to_string())
    }
}
