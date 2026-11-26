import { createSignal, createEffect, Show } from "solid-js";
import {
  File, Folder, Image, Film, Music, Code, FileText, Archive
} from "lucide-solid";

const IMAGE_EXTS = new Set(["jpg","jpeg","png","gif","webp","svg","bmp","ico","tiff"]);
const VIDEO_EXTS = new Set(["mp4","mov","avi","mkv","webm","m4v","wmv","flv"]);
const AUDIO_EXTS = new Set(["mp3","wav","flac","ogg","aac","m4a","wma","aiff"]);
const CODE_EXTS  = new Set(["js","ts","jsx","tsx","py","rs","go","java","c","cpp","h","hpp","rb","php","swift","kt","vue","svelte","html","css","scss","json","toml","yaml","yml","sh","bash","zsh","fish"]);
const ARCHIVE_EXTS = new Set(["zip","tar","gz","bz2","xz","7z","rar","tgz","dmg"]);

export default function FileIcon({ file, size = 16 }) {
  const ext = file.extension?.toLowerCase();
  const color = "currentColor";

  if (file.is_dir) return <Folder size={size} style="color:#d4a017" />;
  if (IMAGE_EXTS.has(ext)) return <Image size={size} style="color:#7ec8e3" />;
  if (VIDEO_EXTS.has(ext)) return <Film size={size} style="color:#b88af8" />;
  if (AUDIO_EXTS.has(ext)) return <Music size={size} style="color:#f0a3d0" />;
  if (CODE_EXTS.has(ext))  return <Code size={size} style="color:#7ec88a" />;
  if (ext === "pdf")        return <FileText size={size} style="color:#f47f7f" />;
  if (ARCHIVE_EXTS.has(ext)) return <Archive size={size} style="color:#f4c97f" />;
  return <File size={size} style="color:var(--muted)" />;
}
