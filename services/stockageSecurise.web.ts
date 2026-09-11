import type { Storage } from "./storage";

/**
 * Browser fallback for the secure store — the primary target has no keychain.
 *
 * `localStorage` is readable by any script running on the page, so this is
 * only as secure as the page itself: no HTML injection anywhere, and an access
 * token that dies after 120 s. The refresh token survives a reload, which is
 * what "session persistee" requires on a shared till. ADR 006 records the
 * trade-off and the alternatives that were turned down.
 *
 * Accessed through a getter, not captured once: touching `window.localStorage`
 * throws when site data is blocked, and that must not happen at import time.
 */
function store(): globalThis.Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const stockageSecurise: Storage = {
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
      // Quota exceeded, or site data blocked. Reported as absence on next read.
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
