import { keychain } from '@/lib/auth/keychain';

/**
 * Mock-only persistence so the fake server "remembers" users and sessions across app
 * restarts, like a real backend would. Separate key from the app's own session.
 */
export type MockPersistence = {
  load: () => Promise<string | null>;
  save: (json: string) => Promise<void>;
  clear: () => Promise<void>;
};

const KEY = 'nexa.mock.db.v1';

export const secureStorePersistence: MockPersistence = {
  load: () => keychain.get(KEY),
  save: (json) => keychain.set(KEY, json),
  clear: () => keychain.remove(KEY),
};

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
