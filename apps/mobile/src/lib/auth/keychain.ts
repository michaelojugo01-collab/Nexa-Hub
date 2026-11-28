import * as SecureStore from 'expo-secure-store';

/** iOS Keychain / Android Keystore via expo-secure-store. */
export const keychain = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
