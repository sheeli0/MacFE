mod commands;
mod state;

use commands::archive::{compress_to_zip, uncompress_archive};
use commands::fs_ops::{
    copy_files, create_dir, delete_files, get_file_metadata, list_dir, move_files, open_file,
    open_in_terminal, rename_file,
};
use commands::search::search_files;
use commands::share::share_via_imessage;
use state::{clear_clipboard, get_clipboard, set_clipboard, ClipboardState};
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(ClipboardState::default()))
        .invoke_handler(tauri::generate_handler![
            list_dir,
            copy_files,
            move_files,
            delete_files,
            create_dir,
            rename_file,
            get_file_metadata,
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
