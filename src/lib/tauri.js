import { invoke } from "@tauri-apps/api/core";

export const listDir = (path) => invoke("list_dir", { path });
export const copyFiles = (sources, dest) => invoke("copy_files", { sources, dest });
export const moveFiles = (sources, dest) => invoke("move_files", { sources, dest });
export const deleteFiles = (paths) => invoke("delete_files", { paths });
export const createDir = (path) => invoke("create_dir", { path });
export const renameFile = (path, newName) => invoke("rename_file", { path, newName });
export const getFileMetadata = (path) => invoke("get_file_metadata", { path });
export const setClipboard = (paths, isCut) => invoke("set_clipboard", { paths, isCut });
export const getClipboard = () => invoke("get_clipboard");
export const clearClipboard = () => invoke("clear_clipboard");
export const searchFiles = (root, query, maxResults) => invoke("search_files", { root, query, maxResults });
export const compressToZip = (paths, dest) => invoke("compress_to_zip", { paths, dest });
export const uncompressArchive = (path, dest) => invoke("uncompress_archive", { path, dest });
export const shareViaImessage = (path) => invoke("share_via_imessage", { path });
export const openFile = (path) => invoke("open_file", { path });
export const openInTerminal = (path) => invoke("open_in_terminal", { path });
