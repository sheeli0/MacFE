use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

pub struct WatcherState(pub Mutex<HashMap<String, RecommendedWatcher>>);

impl Default for WatcherState {
    fn default() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

#[tauri::command]
pub fn watch_dir(
    app: AppHandle,
    pane_id: String,
    path: String,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.is_dir() {
        return Ok(());
    }

    let watched_path = path.clone();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(ev) = res {
                // Ignore pure access/metadata noise when possible; emit for create/modify/remove
                if !ev.kind.is_access() {
                    let _ = app.emit("dir-changed", &watched_path);
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&target, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    map.insert(pane_id, watcher);
    Ok(())
}

#[tauri::command]
pub fn unwatch_dir(pane_id: String, state: State<'_, WatcherState>) -> Result<(), String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    map.remove(&pane_id);
    Ok(())
}
