// Saved shows live in localStorage (no backend). Every access is guarded: storage can be blocked.
import { migrateStorageKey } from "@/storageMigration";
import { decodeShow, encodeShow } from "./codec";
import type { Show } from "./types";

const KEY = "crackerz-shows";

export interface SavedShow {
  name: string;
  savedAt: number;
  code: string;
}

export function listShows(): SavedShow[] {
  migrateStorageKey("crackerverse-shows", KEY);
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedShow[]) : [];
    return Array.isArray(list) ? list.sort((a, b) => b.savedAt - a.savedAt) : [];
  } catch {
    return [];
  }
}

/** Saves (or overwrites by name). Returns false if storage is unavailable. */
export function saveShow(show: Show): boolean {
  try {
    const list = listShows().filter((s) => s.name !== show.name);
    list.unshift({ name: show.name, savedAt: Date.now(), code: encodeShow(show) });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
    return true;
  } catch {
    return false;
  }
}

export function loadShow(saved: SavedShow): Show | null {
  return decodeShow(saved.code);
}

export function deleteShow(name: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(listShows().filter((s) => s.name !== name)));
  } catch {
    // Storage blocked: nothing to delete.
  }
}
