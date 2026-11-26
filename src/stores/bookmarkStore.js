import { createStore } from "solid-js/store";

function loadFromStorage() {
  try {
    const favorites = JSON.parse(localStorage.getItem("fe_favorites") || "[]");
    const recent = JSON.parse(localStorage.getItem("fe_recent") || "[]");
    return { favorites, recent };
  } catch {
    return { favorites: [], recent: [] };
  }
}

const initial = loadFromStorage();

const [bookmarkStore, setBookmarkStore] = createStore({
  favorites: initial.favorites,
  recent: initial.recent,
});

export { bookmarkStore };

function persist() {
  localStorage.setItem("fe_favorites", JSON.stringify(bookmarkStore.favorites));
  localStorage.setItem("fe_recent", JSON.stringify(bookmarkStore.recent));
}

export function addFavorite(path) {
  if (bookmarkStore.favorites.some((f) => f.path === path)) return;
  const name = path.split("/").filter(Boolean).pop() || path;
  setBookmarkStore("favorites", (f) => [...f, { path, name }]);
  persist();
}

export function removeFavorite(path) {
  setBookmarkStore("favorites", (f) => f.filter((fav) => fav.path !== path));
  persist();
}

export function addRecent(path) {
  setBookmarkStore("recent", (r) => {
    const filtered = r.filter((p) => p !== path);
    return [path, ...filtered].slice(0, 20);
  });
  persist();
}

export function clearRecent() {
  setBookmarkStore("recent", []);
  persist();
}
