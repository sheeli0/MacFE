import {
  copyFiles as tauriCopyFiles,
  moveFiles as tauriMoveFiles,
  renameFile as tauriRenameFile,
  getFileMetadata,
} from "./tauri";

function transfer(paths, dest, isCut) {
  return isCut ? tauriMoveFiles(paths, dest) : tauriCopyFiles(paths, dest);
}

/**
 * Pastes or drops `sources` into `destPath`, resolving filename conflicts via `onConflict`.
 */
export async function pasteWithConflicts({ sources, isCut, destPath, existingFiles, onConflict }) {
  if (!sources?.length) return;
  const existingMap = new Map(existingFiles.map((f) => [f.name, f]));

  const nonConflicting = [];
  const conflicts = [];
  for (const src of sources) {
    const name = src.split("/").filter(Boolean).pop();
    if (existingMap.has(name)) {
      let incomingMeta = { name, path: src, size: 0, modified: 0 };
      try {
        const m = await getFileMetadata(src);
        incomingMeta = { name: m.name, path: m.path, size: m.size, modified: m.modified };
      } catch {}
      conflicts.push({ src, existing: existingMap.get(name), incoming: incomingMeta });
    } else {
      nonConflicting.push(src);
    }
  }

  if (nonConflicting.length > 0) {
    await transfer(nonConflicting, destPath, isCut);
  }

  let applyAllAction = null;
  for (const item of conflicts) {
    let action = applyAllAction;
    if (!action) {
      const res = await onConflict(item.existing, item.incoming);
      action = res.action;
      if (res.applyToAll) applyAllAction = action;
      if (action === "rename_incoming" && res.newName) {
        const renamed = await tauriRenameFile(item.src, res.newName);
        await transfer([renamed], destPath, isCut);
        continue;
      }
      if (action === "rename_existing" && res.newName) {
        await tauriRenameFile(item.existing.path, res.newName);
        await transfer([item.src], destPath, isCut);
        continue;
      }
    }
    if (action === "replace") {
      await transfer([item.src], destPath, isCut);
    } else if (action === "keep_both") {
      const dot = item.incoming.name.lastIndexOf(".");
      const newName = dot > 0
        ? `${item.incoming.name.slice(0, dot)} (copy)${item.incoming.name.slice(dot)}`
        : `${item.incoming.name} (copy)`;
      const renamed = await tauriRenameFile(item.src, newName);
      await transfer([renamed], destPath, isCut);
    }
  }
}
