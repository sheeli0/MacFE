export function formatSize(size, isDir = false, withExactBytes = false) {
  if (isDir) return "—";
  const bytesStr = `${size.toLocaleString()} bytes`;
  if (size < 1024) return withExactBytes ? bytesStr : `${size} B`;
  let formatted;
  if (size < 1024 * 1024) formatted = `${(size / 1024).toFixed(1)} KB`;
  else if (size < 1024 * 1024 * 1024) formatted = `${(size / 1024 / 1024).toFixed(1)} MB`;
  else formatted = `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return withExactBytes ? `${formatted} (${bytesStr})` : formatted;
}

export function formatDate(ms, withTime = false) {
  if (!ms) return "—";
  const d = new Date(ms);
  return withTime
    ? d.toLocaleString()
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function parentDir(path) {
  const parts = path.replace(/\/$/, "").split("/");
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join("/") || "/";
}
