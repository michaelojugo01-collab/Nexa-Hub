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
