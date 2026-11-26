use serde::{Deserialize, Serialize};
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
    pub created: u64,
    pub extension: Option<String>,
    pub is_hidden: bool,
    pub permissions: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub size_human: String,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub extension: Option<String>,
    pub mime_type: Option<String>,
    pub permissions: String,
    pub created: u64,
    pub modified: u64,
    pub accessed: u64,
}

fn system_time_to_millis(t: SystemTime) -> u64 {
    t.duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn mode_to_string(mode: u32) -> String {
    let chars = ['x', 'w', 'r'];
    let mut s = String::with_capacity(9);
    for shift in (0..9).rev() {
        let bit = (mode >> shift) & 1;
        if bit == 1 {
            s.push(chars[shift % 3]);
        } else {
            s.push('-');
        }
    }
    s
}

fn human_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut value = size as f64;
    let mut unit_idx = 0;
    while value >= 1024.0 && unit_idx < UNITS.len() - 1 {
        value /= 1024.0;
        unit_idx += 1;
    }
    if unit_idx == 0 {
        format!("{} B", size)
    } else {
        format!("{:.1} {}", value, UNITS[unit_idx])
    }
}

fn entry_from_path(p: &Path) -> Result<FileEntry, String> {
    let meta = fs::metadata(p).map_err(|e| e.to_string())?;
    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let extension = if meta.is_dir() {
        None
    } else {
        p.extension().map(|e| e.to_string_lossy().to_string())
    };
    let is_hidden = name.starts_with('.');
    let mode = meta.permissions().mode();
    let permissions = mode_to_string(mode & 0o777);
    let modified = meta.modified().map(system_time_to_millis).unwrap_or(0);
    let created = meta.created().map(system_time_to_millis).unwrap_or(0);

    Ok(FileEntry {
        name,
        path: p.to_string_lossy().to_string(),
        is_dir: meta.is_dir(),
        size: if meta.is_dir() { 0 } else { meta.len() },
        modified,
        created,
        extension,
        is_hidden,
        permissions,
    })
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let mut entries = Vec::new();
    let read_dir = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in read_dir {
        match entry {
            Ok(e) => match entry_from_path(&e.path()) {
                Ok(fe) => entries.push(fe),
                Err(_) => {}
            },
            Err(_) => {}
        }
    }
    Ok(entries)
}

fn copy_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if src.is_dir() {
        fs::create_dir_all(dst).map_err(|e| e.to_string())?;
        for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name();
            copy_recursive(&entry.path(), &dst.join(name))?;
        }
    } else {
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::copy(src, dst).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn copy_files(sources: Vec<String>, dest: String) -> Result<(), String> {
    let dst_dir = PathBuf::from(&dest);
    for src_str in &sources {
        let src = Path::new(src_str);
        let file_name = src
            .file_name()
            .ok_or_else(|| format!("Invalid source: {}", src_str))?;
        let dst = dst_dir.join(file_name);
        copy_recursive(src, &dst)?;
    }
    Ok(())
}

#[tauri::command]
pub fn move_files(sources: Vec<String>, dest: String) -> Result<(), String> {
    let dst_dir = PathBuf::from(&dest);
    for src_str in &sources {
        let src = Path::new(src_str);
        let file_name = src
            .file_name()
            .ok_or_else(|| format!("Invalid source: {}", src_str))?;
        let dst = dst_dir.join(file_name);
        // Try rename first (same filesystem), then copy+delete
        if fs::rename(src, &dst).is_err() {
            copy_recursive(src, &dst)?;
            if src.is_dir() {
                fs::remove_dir_all(src).map_err(|e| e.to_string())?;
            } else {
                fs::remove_file(src).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn delete_files(paths: Vec<String>) -> Result<(), String> {
    for p in &paths {
        let path = Path::new(p);
        if path.is_dir() {
            fs::remove_dir_all(path).map_err(|e| format!("Failed to delete {}: {}", p, e))?;
        } else {
            fs::remove_file(path).map_err(|e| format!("Failed to delete {}: {}", p, e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_file(path: String, new_name: String) -> Result<String, String> {
    let src = Path::new(&path);
    let parent = src
        .parent()
        .ok_or_else(|| "No parent directory".to_string())?;
    let dst = parent.join(&new_name);
    fs::rename(src, &dst).map_err(|e| e.to_string())?;
    Ok(dst.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    let p = Path::new(&path);
    let meta = fs::metadata(p).map_err(|e| e.to_string())?;
    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let extension = if meta.is_dir() {
        None
    } else {
        p.extension().map(|e| e.to_string_lossy().to_string())
    };
    let is_hidden = name.starts_with('.');
    let mode = meta.permissions().mode();
    let permissions = mode_to_string(mode & 0o777);
    let size = if meta.is_dir() { 0 } else { meta.len() };
    let size_human = human_size(size);
    let created = meta.created().map(system_time_to_millis).unwrap_or(0);
    let modified = meta.modified().map(system_time_to_millis).unwrap_or(0);
    let accessed = meta.accessed().map(system_time_to_millis).unwrap_or(0);
    let mime_type = extension
        .as_deref()
        .map(|ext| mime_guess::from_ext(ext).first_or_octet_stream().to_string());

    Ok(FileMetadata {
        path,
        name,
        size,
        size_human,
        is_dir: meta.is_dir(),
        is_hidden,
        extension,
        mime_type,
        permissions,
        created,
        modified,
        accessed,
    })
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .args(["-a", "Terminal", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_dir_tmp() {
        let result = list_dir("/tmp".to_string());
        assert!(result.is_ok(), "list_dir /tmp failed: {:?}", result.err());
    }

    #[test]
    fn test_get_file_metadata_tmp() {
        // /tmp itself is always present
        let result = get_file_metadata("/tmp".to_string());
        assert!(
            result.is_ok(),
            "get_file_metadata /tmp failed: {:?}",
            result.err()
        );
        let meta = result.unwrap();
        assert!(meta.is_dir);
        assert_eq!(meta.name, "tmp");
    }

    #[test]
    fn test_mode_to_string() {
        // 0o755 => rwxr-xr-x
        let s = mode_to_string(0o755);
        assert_eq!(s, "rwxr-xr-x");
    }

    #[test]
    fn test_human_size() {
        assert_eq!(human_size(0), "0 B");
        assert_eq!(human_size(1023), "1023 B");
        assert_eq!(human_size(1024), "1.0 KB");
        assert_eq!(human_size(1024 * 1024), "1.0 MB");
    }
}
