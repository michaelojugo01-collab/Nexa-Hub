// Reanimated 4: use its official Jest setup so animations run synchronously.
require('react-native-reanimated').setUpTests?.();

// In-memory keychain so session code can be tested end to end. `__keychain` lets tests inspect it.
jest.mock('@/lib/auth/keychain', () => {
  const memory = new Map<string, string>();
  return {
    __keychain: memory,
    keychain: {
      get: async (key: string) => memory.get(key) ?? null,
      set: async (key: string, value: string) => {
        memory.set(key, value);
      },
      remove: async (key: string) => {
        memory.delete(key);
      },
    },
  };
});

// Network state: online by default. Tests that need offline mock '@/lib/use-online'.
jest.mock('expo-network', () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true, type: 'WIFI' }),
  addNetworkStateListener: () => ({ remove: () => {} }),
  getNetworkStateAsync: async () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'WIFI',
  }),
  NetworkStateType: { WIFI: 'WIFI', NONE: 'NONE' },
}));

// expo-file-system: an in-memory file system (drafts, upload progress, mock products).
// `__fs` lets tests create files: __fs.set('file:///docs/a.pdf', new Uint8Array(n)).
jest.mock('expo-file-system', () => {
  const files = new Map<string, Uint8Array>();
  const join = (...parts: (string | { uri: string })[]) =>
    parts
      .map((p) => (typeof p === 'string' ? p : p.uri))
      .join('/')
      .replace(/([^:])\/{2,}/g, '$1/');
  const encode = (s: string) => new TextEncoder().encode(s);
  class MockFile {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(...parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    get size() {
      return files.get(this.uri)?.byteLength ?? 0;
    }
    get name() {
      return this.uri.split('/').pop() ?? '';
    }
    create() {
      if (!files.has(this.uri)) files.set(this.uri, new Uint8Array());
    }
    write(content: string | Uint8Array) {
      files.set(this.uri, typeof content === 'string' ? encode(content) : content);
    }
    async text() {
      return new TextDecoder().decode(files.get(this.uri) ?? new Uint8Array());
    }
    textSync() {
      return new TextDecoder().decode(files.get(this.uri) ?? new Uint8Array());
    }
    async bytes() {
      return files.get(this.uri) ?? new Uint8Array();
    }
    delete() {
      files.delete(this.uri);
    }
    copy(dest: MockFile) {
      files.set(dest.uri, files.get(this.uri) ?? new Uint8Array());
    }
    open() {
      const data = files.get(this.uri) ?? new Uint8Array();
      return {
        offset: 0,
        size: data.byteLength,
        readBytesSync(length: number) {
          const chunk = data.slice(this.offset, this.offset + length);
          this.offset += chunk.byteLength;
          return chunk;
        },
        close() {},
      };
    }
  }
  class MockDirectory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(...parts);
    }
    get exists() {
      return true;
    }
    create() {}
  }
  return {
    __fs: files,
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: { uri: 'file:///docs' }, cache: { uri: 'file:///cache' } },
  };
});

// Media players and the document picker are native: simple stand-ins in Jest.
jest.mock('expo-video', () => ({
  VideoView: () => null,
  useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn(), loop: false }),
}));
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 30 }),
}));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));
