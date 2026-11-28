/**
 * Web has no secure store. Web is not a target for the app (only used for previews), so
 * values live in memory and vanish on reload. Never fall back to localStorage for tokens.
 */
const memory = new Map<string, string>();

export const keychain = {
  get: async (key: string) => memory.get(key) ?? null,
  set: async (key: string, value: string) => {
    memory.set(key, value);
  },
  remove: async (key: string) => {
    memory.delete(key);
  },
};
