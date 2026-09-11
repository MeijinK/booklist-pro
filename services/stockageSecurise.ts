import * as SecureStore from "expo-secure-store";

import type { Storage } from "./storage";

/**
 * Where the tokens live on a device: the system keychain (iOS) or keystore
 * (Android), through expo-secure-store. The browser has no equivalent; its
 * fallback is in `stockageSecurise.web.ts` and documented in ADR 006.
 *
 * Same contract and same failure policy as `storage.ts`: a refused write is
 * reported as absence, never as an exception reaching a screen. Losing a
 * session is a nuisance; a blank screen at the till is an incident.
 */
export const stockageSecurise: Storage = {
  async read(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async write(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Deliberately silent: see the note above.
    }
  },

  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Deliberately silent: see the note above.
    }
  },
};
