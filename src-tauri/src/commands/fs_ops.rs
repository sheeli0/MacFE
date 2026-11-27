use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::ffi::CString;
use std::fs;
use std::io::Read;
use std::os::unix::ffi::OsStrExt;
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

fn extract_common_meta(
    p: &Path,
    meta: &fs::Metadata,
) -> (String, bool, u64, u64, u64, Option<String>, bool, String) {
    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let is_dir = meta.is_dir();
    let extension = if is_dir {
        None
    } else {
        p.extension().map(|e| e.to_string_lossy().to_string())
    };
    let is_hidden = name.starts_with('.');
    let permissions = mode_to_string(meta.permissions().mode() & 0o777);
    let size = if is_dir { 0 } else { meta.len() };
    let modified = meta.modified().map(system_time_to_millis).unwrap_or(0);
    let created = meta.created().map(system_time_to_millis).unwrap_or(0);
    (name, is_dir, size, modified, created, extension, is_hidden, permissions)
}

fn entry_from_dir_entry(entry: fs::DirEntry) -> Result<FileEntry, String> {
    let p = entry.path();
    let meta = entry.metadata().map_err(|e| e.to_string())?;
    let (name, is_dir, size, modified, created, extension, is_hidden, permissions) =
        extract_common_meta(&p, &meta);

    Ok(FileEntry {
        name,
        path: p.to_string_lossy().to_string(),
        is_dir,
        size,
        modified,
        created,
        extension,
        is_hidden,
        permissions,
    })
}

fn expand_tilde(path: &str) -> PathBuf {
    if path == "~" || path.starts_with("~/") {
        if let Ok(home) = std::env::var("HOME") {
            if path == "~" {
                return PathBuf::from(home);
            }
            return PathBuf::from(home).join(&path[2..]);
        }
    }
    PathBuf::from(path)
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    std::env::var("HOME").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let dir = expand_tilde(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let read_dir = fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut entries = Vec::with_capacity(64);
    for entry in read_dir.flatten() {
        if let Ok(fe) = entry_from_dir_entry(entry) {
            entries.push(fe);
        }
    }
    Ok(entries)
}

#[cfg(target_os = "macos")]
fn apfs_clone_file(src: &Path, dst: &Path) -> bool {
    let Ok(c_src) = CString::new(src.as_os_str().as_bytes()) else {
        return false;
    };
    let Ok(c_dst) = CString::new(dst.as_os_str().as_bytes()) else {
        return false;
    };
    // Remove destination if it already exists before clonefile
    let _ = fs::remove_file(dst);
    unsafe extern "C" {
        fn clonefile(src: *const libc::c_char, dst: *const libc::c_char, flags: u32) -> libc::c_int;
    }
    unsafe { clonefile(c_src.as_ptr(), c_dst.as_ptr(), 0) == 0 }
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
        #[cfg(target_os = "macos")]
        if apfs_clone_file(src, dst) {
            return Ok(());
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
        if trash::delete(path).is_err() {
            if path.is_dir() {
                fs::remove_dir_all(path).map_err(|e| format!("Failed to delete {}: {}", p, e))?;
            } else {
                fs::remove_file(path).map_err(|e| format!("Failed to delete {}: {}", p, e))?;
            }
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
    let p = expand_tilde(&path);
    let meta = fs::metadata(&p).map_err(|e| e.to_string())?;
    let (name, is_dir, size, modified, created, extension, is_hidden, permissions) =
        extract_common_meta(&p, &meta);
    let size_human = human_size(size);
    let accessed = meta.accessed().map(system_time_to_millis).unwrap_or(0);
    let mime_type = extension
        .as_deref()
        .map(|ext| mime_guess::from_ext(ext).first_or_octet_stream().to_string());

    Ok(FileMetadata {
        path: p.to_string_lossy().to_string(),
        name,
        size,
        size_human,
        is_dir,
        is_hidden,
        extension,
        mime_type,
        permissions,
        created,
        modified,
        accessed,
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FilePreview {
    pub kind: String, // "text" | "image" | "binary"
    pub content: String,
    pub truncated: bool,
    pub size: u64,
}

#[tauri::command]
pub fn read_file_preview(path: String, max_bytes: Option<usize>) -> Result<FilePreview, String> {
    let p = expand_tilde(&path);
    let meta = fs::metadata(&p).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        return Err("Cannot preview directory".to_string());
    }
    let size = meta.len();
    let ext = p
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let is_image = matches!(
        ext.as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico"
    );
    if is_image {
        if size > 5 * 1024 * 1024 {
            return Ok(FilePreview {
                kind: "binary".to_string(),
                content: "Image too large to preview (> 5 MB)".to_string(),
                truncated: true,
                size,
            });
        }
        let bytes = fs::read(&p).map_err(|e| e.to_string())?;
        let mime = mime_guess::from_ext(&ext)
            .first_or_octet_stream()
            .to_string();
        return Ok(FilePreview {
            kind: "image".to_string(),
            content: format!("data:{};base64,{}", mime, BASE64.encode(&bytes)),
            truncated: false,
            size,
        });
    }

    let limit = max_bytes.unwrap_or(65_536);
    let mut f = fs::File::open(&p).map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; limit.min(size as usize)];
    let n = f.read(&mut buf).map_err(|e| e.to_string())?;
    buf.truncate(n);

    if buf.contains(&0) {
        return Ok(FilePreview {
            kind: "binary".to_string(),
            content: "Binary file".to_string(),
            truncated: size > n as u64,
            size,
        });
    }

    let text = String::from_utf8_lossy(&buf).to_string();
    Ok(FilePreview {
        kind: "text".to_string(),
        content: text,
        truncated: size > n as u64,
        size,
    })
}

#[tauri::command]
pub fn get_git_branch(path: String) -> Option<String> {
    let mut cur = expand_tilde(&path);
    if cur.is_file() {
        cur = cur.parent()?.to_path_buf();
    }
    loop {
        let head = cur.join(".git").join("HEAD");
        if head.is_file() {
            let content = fs::read_to_string(head).ok()?;
            let trimmed = content.trim();
            if let Some(branch) = trimmed.strip_prefix("ref: refs/heads/") {
                return Some(branch.to_string());
            }
            return Some(trimmed.chars().take(7).collect());
        }
        if !cur.pop() {
            return None;
        }
    }
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

    #[test]
    fn test_copy_and_preview() {
        let dir = std::env::temp_dir().join("macfe_unit_test");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let src = dir.join("hello.txt");
        fs::write(&src, "hello world").unwrap();

        let dst_dir = dir.join("sub");
        fs::create_dir_all(&dst_dir).unwrap();
        copy_files(
            vec![src.to_string_lossy().to_string()],
            dst_dir.to_string_lossy().to_string(),
        )
        .unwrap();

        let copied = dst_dir.join("hello.txt");
        assert!(copied.exists());
        let preview = read_file_preview(copied.to_string_lossy().to_string(), None).unwrap();
        assert_eq!(preview.kind, "text");
        assert_eq!(preview.content, "hello world");

        let _ = fs::remove_dir_all(&dir);
    }
}
