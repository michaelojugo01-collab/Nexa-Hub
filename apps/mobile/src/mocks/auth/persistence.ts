import { keychain } from '@/lib/auth/keychain';

/**
 * Mock-only persistence so the fake server "remembers" users and sessions across app
 * restarts, like a real backend would. Separate keys from the app's own session.
 */
export type MockPersistence = {
  load: () => Promise<string | null>;
  save: (json: string) => Promise<void>;
  clear: () => Promise<void>;
};

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

export function memoryPersistence(): MockPersistence {
  let value: string | null = null;
  return {
    load: async () => value,
    save: async (json) => {
      value = json;
    },
    clear: async () => {
      value = null;
    },
  };
}
