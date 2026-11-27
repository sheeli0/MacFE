/**
 * Sandboxed Tauri v2 IPC mock injected into Playwright pages.
 * Simulates a deterministic macOS-like filesystem in memory and records all invoke() calls.
 */
export function installTauriMock() {
  const initialTree = {
    "/": [
      { name: "Users", path: "/Users", is_dir: true, size: 0, modified: 1730000000000, created: 1730000000000, extension: null, is_hidden: false, permissions: "rwxr-xr-x" },
      { name: "Applications", path: "/Applications", is_dir: true, size: 0, modified: 1730000000000, created: 1730000000000, extension: null, is_hidden: false, permissions: "rwxr-xr-x" },
    ],
    "/Users": [
      { name: "sheel", path: "/Users/sheel", is_dir: true, size: 0, modified: 1730000000000, created: 1730000000000, extension: null, is_hidden: false, permissions: "rwxr-xr-x" },
      { name: "notes.txt", path: "/Users/sheel/notes.txt".replace("/sheel", ""), is_dir: false, size: 1024, modified: 1730000000000, created: 1730000000000, extension: "txt", is_hidden: false, permissions: "rw-r--r--" },
      { name: "report.pdf", path: "/Users/report.pdf", is_dir: false, size: 204800, modified: 1730000000000, created: 1730000000000, extension: "pdf", is_dir: false, is_hidden: false, permissions: "rw-r--r--" },
      { name: "photo.png", path: "/Users/photo.png", is_dir: false, size: 512000, modified: 1730000000000, created: 1730000000000, extension: "png", is_hidden: false, permissions: "rw-r--r--" },
      { name: "app.js", path: "/Users/app.js", is_dir: false, size: 4096, modified: 1730000000000, created: 1730000000000, extension: "js", is_hidden: false, permissions: "rw-r--r--" },
    ],
    "/Users/sheel": [
      { name: "Documents", path: "/Users/sheel/Documents", is_dir: true, size: 0, modified: 1730000000000, created: 1730000000000, extension: null, is_hidden: false, permissions: "rwxr-xr-x" },
      { name: "Downloads", path: "/Users/sheel/Downloads", is_dir: true, size: 0, modified: 1730000000000, created: 1730000000000, extension: null, is_hidden: false, permissions: "rwxr-xr-x" },
      { name: "report.pdf", path: "/Users/sheel/report.pdf", is_dir: false, size: 99999, modified: 1730000000000, created: 1730000000000, extension: "pdf", is_hidden: false, permissions: "rw-r--r--" },
    ],
    "/Users/sheel/Documents": [
      { name: "spec.md", path: "/Users/sheel/Documents/spec.md", is_dir: false, size: 2048, modified: 1730000000000, created: 1730000000000, extension: "md", is_hidden: false, permissions: "rw-r--r--" },
    ],
    "/Users/sheel/Downloads": [],
    "/Applications": [
      { name: "Safari.app", path: "/Applications/Safari.app", is_dir: true, size: 0, modified: 1730000000000, created: 1730000000000, extension: null, is_hidden: false, permissions: "rwxr-xr-x" },
    ],
  };

  const fsTree = JSON.parse(JSON.stringify(initialTree));
  const calls = [];
  window.__TAURI_CALLS__ = calls;

  function findEntry(path) {
    for (const entries of Object.values(fsTree)) {
      const hit = entries.find((e) => e.path === path);
      if (hit) return hit;
    }
    return null;
  }

  function parentOf(path) {
    const idx = path.lastIndexOf("/");
    return idx <= 0 ? "/" : path.slice(0, idx);
  }

  function basenameOf(path) {
    return path.split("/").filter(Boolean).pop() || path;
  }

  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args = {}) => {
      calls.push({ cmd, args });
      switch (cmd) {
        case "list_dir": {
          const entries = fsTree[args.path];
          if (!entries) throw new Error(`Not a directory: ${args.path}`);
          return JSON.parse(JSON.stringify(entries));
        }
        case "copy_files": {
          const dstList = fsTree[args.dest] || (fsTree[args.dest] = []);
          for (const src of args.sources || []) {
            const entry = findEntry(src);
            const name = basenameOf(src);
            const newPath = `${args.dest === "/" ? "" : args.dest}/${name}`;
            const filtered = dstList.filter((e) => e.name !== name);
            fsTree[args.dest] = filtered;
            filtered.push({ ...(entry || { name, is_dir: false, size: 100, modified: Date.now(), created: Date.now(), extension: null, is_hidden: false, permissions: "rw-r--r--" }), path: newPath });
          }
          return null;
        }
        case "move_files": {
          const dstList = fsTree[args.dest] || (fsTree[args.dest] = []);
          for (const src of args.sources || []) {
            const entry = findEntry(src);
            const srcParent = parentOf(src);
            if (fsTree[srcParent]) {
              fsTree[srcParent] = fsTree[srcParent].filter((e) => e.path !== src);
            }
            const name = basenameOf(src);
            const newPath = `${args.dest === "/" ? "" : args.dest}/${name}`;
            fsTree[args.dest] = dstList.filter((e) => e.name !== name);
            fsTree[args.dest].push({ ...(entry || { name, is_dir: false, size: 100, modified: Date.now(), created: Date.now(), extension: null, is_hidden: false, permissions: "rw-r--r--" }), path: newPath });
          }
          return null;
        }
        case "rename_file": {
          const entry = findEntry(args.path);
          const parent = parentOf(args.path);
          const newPath = `${parent === "/" ? "" : parent}/${args.newName}`;
          if (entry) {
            entry.name = args.newName;
            entry.path = newPath;
          }
          return newPath;
        }
        case "delete_files": {
          for (const p of args.paths || []) {
            const parent = parentOf(p);
            if (fsTree[parent]) {
              fsTree[parent] = fsTree[parent].filter((e) => e.path !== p);
            }
          }
          return null;
        }
        case "get_file_metadata": {
          const entry = findEntry(args.path);
          return {
            path: args.path,
            name: basenameOf(args.path),
            size: entry?.size || 0,
            size_human: `${entry?.size || 0} B`,
            is_dir: entry?.is_dir || false,
            is_hidden: false,
            extension: entry?.extension || null,
            mime_type: entry?.extension === "pdf" ? "application/pdf" : "text/plain",
            permissions: entry?.permissions || "rw-r--r--",
            created: entry?.created || Date.now(),
            modified: entry?.modified || Date.now(),
            accessed: Date.now(),
          };
        }
        case "search_files": {
          const q = (args.query || "").toLowerCase();
          const results = [];
          for (const entries of Object.values(fsTree)) {
            for (const e of entries) {
              if (e.path.startsWith(args.root) && e.name.toLowerCase().includes(q)) {
                results.push({ path: e.path, name: e.name, is_dir: e.is_dir, size: e.size, modified: e.modified });
              }
            }
          }
          return results.slice(0, args.maxResults || 200);
        }
        case "create_dir": {
          const parent = parentOf(args.path);
          const name = basenameOf(args.path);
          const list = fsTree[parent] || (fsTree[parent] = []);
          list.push({ name, path: args.path, is_dir: true, size: 0, modified: Date.now(), created: Date.now(), extension: null, is_hidden: name.startsWith("."), permissions: "rwxr-xr-x" });
          fsTree[args.path] = [];
          return null;
        }
        case "create_new_window":
        case "set_clipboard":
        case "clear_clipboard":
          return null;
        case "get_clipboard":
          return { paths: [], is_cut: false };
        case "compress_to_zip":
          return `${args.paths[0]}.zip`;
        case "share_via_imessage":
        case "open_file":
        case "open_in_terminal":
          return null;
        default:
          return null;
      }
    },
  };
}
