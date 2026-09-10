import type { Storage } from "./storage";

/**
 * Browser implementation of the storage contract — the primary target.
 *
 * `localStorage` is read here through a getter rather than captured once:
 * merely touching `window.localStorage` throws when a browser is set to block
 * site data, and that must not happen while the module is being imported.
 *
 * The interface stays asynchronous even though `localStorage` is not. Aligning
 * on the stricter of the two platforms is what keeps callers free of any
 * platform branch — the cost is that a setting is read one frame after mount,
 * which the splash screen covers.
 */
function store(): globalThis.Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const storage: Storage = {
  async read(key) {
    try {
      return store()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  async write(key, value) {
    try {
      store()?.setItem(key, value);
    } catch {
      // Quota exceeded, or site data blocked. A lost setting is a nuisance,
      // not an incident.
    }
  },

  async remove(key) {
    try {
      store()?.removeItem(key);
    } catch {
      // Same reasoning as write.
    }
  },
};
