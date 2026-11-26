use serde::{Deserialize, Serialize};
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
    let mut results = Vec::new();

    let walker = ignore::WalkBuilder::new(&root)
        .hidden(false)
        .git_ignore(true)
        .build();

    for entry in walker {
        if results.len() >= limit {
            break;
        }
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        let name = match path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };
        if !name.to_lowercase().contains(&query_lower) {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let modified = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        let is_dir = meta.is_dir();
        let size = if is_dir { 0 } else { meta.len() };

        results.push(SearchResult {
            path: path.to_string_lossy().to_string(),
            name,
            is_dir,
            size,
            modified,
        });
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_files_tmp() {
        // Should always succeed; just checking it returns without error
        let result = search_files("/tmp".to_string(), "".to_string(), Some(10));
        assert!(result.is_ok(), "search_files failed: {:?}", result.err());
    }

    #[test]
    fn test_search_files_max_results() {
        // Create a query that probably matches many files and verify limit is respected
        let result = search_files("/tmp".to_string(), "".to_string(), Some(3));
        assert!(result.is_ok());
        assert!(result.unwrap().len() <= 3);
    }
}
