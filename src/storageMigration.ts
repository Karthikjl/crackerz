/**
 * One-time move of browser data saved under the app's old name (CrackerVerse) to the new
 * Crackerz keys, so renaming doesn't wipe anyone's settings or saved shows.
 */
export function migrateStorageKey(oldKey: string, newKey: string): void {
  try {
    const old = localStorage.getItem(oldKey);
    if (old === null) return;
    if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, old);
    localStorage.removeItem(oldKey);
  } catch {
    // Storage blocked: nothing to migrate.
  }
}
