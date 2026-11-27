use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
}

#[tauri::command]
pub fn search_files(
    root: String,
    query: String,
    max_results: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    let limit = max_results.unwrap_or(500);
    let query_lower = query.to_lowercase();
    let results = Arc::new(Mutex::new(Vec::with_capacity(limit.min(256))));

    // Leverage all Apple Silicon P+E cores via parallel directory walking
    let threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);

    let walker = ignore::WalkBuilder::new(&root)
        .hidden(false)
        .git_ignore(true)
        .threads(threads)
        .build_parallel();

    walker.run(|| {
        let results = Arc::clone(&results);
        let query_lower = query_lower.clone();
        Box::new(move |entry| {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => return ignore::WalkState::Continue,
            };
            let path = entry.path();
            let Some(name) = path.file_name().map(|n| n.to_string_lossy().to_string()) else {
                return ignore::WalkState::Continue;
            };
            if !name.to_lowercase().contains(&query_lower) {
                return ignore::WalkState::Continue;
            }
            let Ok(meta) = entry.metadata() else {
                return ignore::WalkState::Continue;
            };
            let modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            let is_dir = meta.is_dir();
            let size = if is_dir { 0 } else { meta.len() };

            let mut guard = results.lock().unwrap();
            if guard.len() >= limit {
                return ignore::WalkState::Quit;
            }
            guard.push(SearchResult {
                path: path.to_string_lossy().to_string(),
                name,
                is_dir,
                size,
                modified,
            });
            if guard.len() >= limit {
                ignore::WalkState::Quit
            } else {
                ignore::WalkState::Continue
            }
        })
    });

    let final_results = results.lock().unwrap().clone();
    Ok(final_results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_files_tmp() {
        let result = search_files("/tmp".to_string(), "".to_string(), Some(10));
        assert!(result.is_ok(), "search_files failed: {:?}", result.err());
    }

    #[test]
    fn test_search_files_max_results() {
        let result = search_files("/tmp".to_string(), "".to_string(), Some(3));
        assert!(result.is_ok());
        assert!(result.unwrap().len() <= 3);
    }
}
