import type { MockPersistence } from '@nexa/mocks';
import { File, Paths } from 'expo-file-system';

import { keychain } from '@/lib/auth/keychain';

/**
 * Mock-only persistence so the fake server "remembers" users, sessions and stores across app
 * restarts, like a real backend would. Separate keys from the app's own session.
 */
function keychainPersistence(key: string): MockPersistence {
  return {
    load: () => keychain.get(key),
    save: (json) => keychain.set(key, json),
    clear: () => keychain.remove(key),
  };
}

export const secureStorePersistence = keychainPersistence('nexa.mock.db.v1');

/** Stores and follows (F2) live under their own key to keep each value small. */
export const storesSecureStorePersistence = keychainPersistence('nexa.mock.stores.v1');

/**
 * Bigger mock data (products, upload progress) lives in a JSON file in the app's document
 * folder, which has no size limit like the keychain. Mock mode only.
 */
export function filePersistence(fileName: string): MockPersistence {
  const file = () => new File(Paths.document, fileName);
  return {
    load: async () => {
      const f = file();
      return f.exists ? f.text() : null;
    },
    save: async (json) => {
      const f = file();
      if (!f.exists) f.create();
      f.write(json);
    },
    clear: async () => {
      const f = file();
      if (f.exists) f.delete();
    },
  };
}
