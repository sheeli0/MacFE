#[tauri::command]
pub fn share_via_imessage(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .args(["-a", "Messages", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
