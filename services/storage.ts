import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Key/value persistence, behind one interface.
 *
 * Nothing outside this file knows how a value is stored. On a device that is
 * AsyncStorage; on the browser it is `localStorage`, in `storage.web.ts`. The
 * two implementations share this contract so that a caller never branches on
 * the platform — a point the subject watches for in code review.
 *
 * Every operation swallows its failures and reports absence instead. Storage is
 * refused in a private browsing window, full on an old workstation, and
 * corrupted often enough to matter: none of that is worth losing a screen over,
 * and a setting that fails to persist is a nuisance, not an incident.
 */
export type Storage = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export const storage: Storage = {
  async read(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async write(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Deliberately silent: see the note above.
    }
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Deliberately silent: see the note above.
    }
  },
};
