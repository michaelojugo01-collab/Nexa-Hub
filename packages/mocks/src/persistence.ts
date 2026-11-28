/**
 * Where a fake server keeps its state between restarts. The app passes a secure-store
 * version (mock-only keys); the web and tests use memory.
 */
export type MockPersistence = {
  load: () => Promise<string | null>;
  save: (json: string) => Promise<void>;
  clear: () => Promise<void>;
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
