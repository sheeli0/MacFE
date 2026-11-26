use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

fn add_path_to_zip(
    zip: &mut ZipWriter<File>,
    path: &Path,
    base: &Path,
) -> Result<(), String> {
    if path.is_dir() {
        let entries = std::fs::read_dir(path).map_err(|e| e.to_string())?;
        // Add directory entry
        let rel = path.strip_prefix(base).map_err(|e| e.to_string())?;
        let rel_str = rel.to_string_lossy().to_string() + "/";
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Stored);
        zip.add_directory(&rel_str, options)
            .map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            add_path_to_zip(zip, &entry.path(), base)?;
        }
    } else {
        let rel = path.strip_prefix(base).map_err(|e| e.to_string())?;
        let rel_str = rel.to_string_lossy().to_string();
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated);
        zip.start_file(&rel_str, options)
            .map_err(|e| e.to_string())?;
        let mut f = File::open(path).map_err(|e| e.to_string())?;
        let mut buf = Vec::new();
        f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        zip.write_all(&buf).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn compress_to_zip(paths: Vec<String>, dest: Option<String>) -> Result<String, String> {
    if paths.is_empty() {
        return Err("No paths provided".to_string());
    }
    let first = Path::new(&paths[0]);
    let zip_path = if let Some(d) = dest {
        PathBuf::from(d)
    } else {
        let stem = first
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "archive".to_string());
        let parent = first
            .parent()
            .unwrap_or_else(|| Path::new("."));
        parent.join(format!("{}.zip", stem))
    };

    let zip_file = File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(zip_file);

    for path_str in &paths {
        let path = Path::new(path_str);
        // Use parent of the item as the base so the item itself is included in the zip
        let base = path.parent().unwrap_or_else(|| Path::new("/"));
        add_path_to_zip(&mut zip, path, base)?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn uncompress_archive(path: String, dest: Option<String>) -> Result<String, String> {
    let zip_path = Path::new(&path);
    let out_dir = if let Some(d) = dest {
        PathBuf::from(d)
    } else {
        let stem = zip_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "extracted".to_string());
        let parent = zip_path
            .parent()
            .unwrap_or_else(|| Path::new("."));
        parent.join(stem)
    };

    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    let zip_file = File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(zip_file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let out_path = out_dir.join(entry.name());

        if entry.name().ends_with('/') {
            std::fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out_file = File::create(&out_path).map_err(|e| e.to_string())?;
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            out_file.write_all(&buf).map_err(|e| e.to_string())?;
        }
    }

    Ok(out_dir.to_string_lossy().to_string())
}
