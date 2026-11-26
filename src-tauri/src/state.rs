use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ClipboardState {
    pub paths: Vec<String>,
    pub is_cut: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipboardPayload {
    pub paths: Vec<String>,
    pub is_cut: bool,
}

#[tauri::command]
pub fn set_clipboard(
    paths: Vec<String>,
    is_cut: bool,
    state: State<'_, Mutex<ClipboardState>>,
) -> Result<(), String> {
    let mut clipboard = state.lock().map_err(|e| e.to_string())?;
    clipboard.paths = paths;
    clipboard.is_cut = is_cut;
    Ok(())
}

#[tauri::command]
pub fn get_clipboard(
    state: State<'_, Mutex<ClipboardState>>,
) -> Result<ClipboardPayload, String> {
    let clipboard = state.lock().map_err(|e| e.to_string())?;
    Ok(ClipboardPayload {
        paths: clipboard.paths.clone(),
        is_cut: clipboard.is_cut,
    })
}

#[tauri::command]
pub fn clear_clipboard(
    state: State<'_, Mutex<ClipboardState>>,
) -> Result<(), String> {
    let mut clipboard = state.lock().map_err(|e| e.to_string())?;
    clipboard.paths.clear();
    clipboard.is_cut = false;
    Ok(())
}
