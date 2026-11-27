mod commands;
mod state;
mod watcher;

use commands::archive::{compress_to_zip, uncompress_archive};
use commands::fs_ops::{
    copy_files, create_dir, delete_files, get_file_metadata, get_git_branch, get_home_dir,
    list_dir, move_files, open_file, open_in_terminal, read_file_preview, rename_file,
};
use commands::search::search_files;
use commands::share::share_via_imessage;
use state::{clear_clipboard, get_clipboard, set_clipboard, ClipboardState};
use watcher::{unwatch_dir, watch_dir, WatcherState};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

static WIN_COUNTER: AtomicUsize = AtomicUsize::new(1);

#[tauri::command]
fn create_new_window(app: AppHandle, path: Option<String>) -> Result<(), String> {
    let id = WIN_COUNTER.fetch_add(1, Ordering::SeqCst);
    let label = format!("fe-win-{}", id);
    let url = match path {
        Some(p) if !p.is_empty() => {
            let encoded: String = p
                .bytes()
                .flat_map(|b| match b {
                    b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' | b'/' => {
                        vec![b as char]
                    }
                    _ => format!("%{:02X}", b).chars().collect(),
                })
                .collect();
            WebviewUrl::App(format!("index.html?path={}", encoded).into())
        }
        _ => WebviewUrl::App("index.html".into()),
    };

    WebviewWindowBuilder::new(&app, label, url)
        .title("FE")
        .inner_size(1280.0, 800.0)
        .min_inner_size(600.0, 400.0)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(ClipboardState::default()))
        .manage(WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            list_dir,
            copy_files,
            move_files,
            delete_files,
            create_dir,
            rename_file,
            get_file_metadata,
            get_home_dir,
            create_new_window,
            read_file_preview,
            get_git_branch,
            watch_dir,
            unwatch_dir,
            set_clipboard,
            get_clipboard,
            clear_clipboard,
            search_files,
            compress_to_zip,
            uncompress_archive,
            share_via_imessage,
            open_file,
            open_in_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
