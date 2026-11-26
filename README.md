# MacFE — FE File Explorer

A fast, beautiful macOS file explorer built as a Finder replacement.

## Stack
- **Framework**: Tauri 2 (Rust backend)
- **UI**: Solid.js
- **Styling**: Tailwind CSS
- **Icons**: Lucide

## Features
- True multi-window support (new windows stay on current desktop)
- Cut (Cmd+X) + Paste file operations
- Editable breadcrumb path bar
- N-pane layout (1–4 panes side by side)
- Fast recursive search (Rust `ignore` crate)
- Smart bookmarks: LRU recent dirs + pinned favorites
- Rich file properties panel (absolute path, compress, share via iMessage)
- Smart paste conflict resolver (rename in-place, replace, skip)

## Development

```bash
# Install deps
npm install

# Dev mode
npm run tauri dev

# Build
npm run tauri build
```

## Git Workflow
- `main` — always clean, never committed to directly
- `feat/<name>` — feature branches, merged via PR
- `fix/<name>` — bug fix branches, merged via PR
