import type { Me, TokenPair } from '@nexa/api-contract';
import { keychain } from './keychain';

/**
 * Everything session-related lives in the OS keychain/keystore via expo-secure-store.
 * Never AsyncStorage. Keys are namespaced `nexa.*`.
 */
const KEYS = {
  accessToken: 'nexa.auth.accessToken',
  accessTokenExpiresAt: 'nexa.auth.accessTokenExpiresAt',
  refreshToken: 'nexa.auth.refreshToken',
  user: 'nexa.auth.user',
  deviceId: 'nexa.device.id',
  localAvatarUri: 'nexa.profile.localAvatarUri',
  lockMode: 'nexa.lock.mode',
  lockPin: 'nexa.lock.pin',
  lockFailures: 'nexa.lock.failures',
} as const;

export type LockMode = 'off' | 'biometric' | 'pin';

export type StoredSession = TokenPair & { user: Me | null };

async function get(key: string) {
  try {
    return await keychain.get(key);
  } catch {
    return null;
  }
}

export const secureStorage = {
  async loadSession(): Promise<StoredSession | null> {
    const [accessToken, accessTokenExpiresAt, refreshToken, userJson] = await Promise.all([
      get(KEYS.accessToken),
      get(KEYS.accessTokenExpiresAt),
      get(KEYS.refreshToken),
      get(KEYS.user),
    ]);
    if (!refreshToken) return null;
    let user: Me | null = null;
    try {
      user = userJson ? (JSON.parse(userJson) as Me) : null;
    } catch {
      user = null;
    }
    return {
      accessToken: accessToken ?? '',
      accessTokenExpiresAt: accessTokenExpiresAt ?? new Date(0).toISOString(),
      refreshToken,
      user,
    };
  },

  async saveTokens(tokens: TokenPair) {
    await Promise.all([
      keychain.set(KEYS.accessToken, tokens.accessToken),
      keychain.set(KEYS.accessTokenExpiresAt, tokens.accessTokenExpiresAt),
      keychain.set(KEYS.refreshToken, tokens.refreshToken),
    ]);
  },

  /** Cached copy of /v1/me so a restart can show the app before the network answers. */
  async saveUser(user: Me) {
    await keychain.set(KEYS.user, JSON.stringify(user)).catch(() => undefined);
  },

  async clearSession() {
    await Promise.all(
      [
        KEYS.accessToken,
        KEYS.accessTokenExpiresAt,
        KEYS.refreshToken,
        KEYS.user,
        KEYS.localAvatarUri,
      ].map((k) => keychain.remove(k).catch(() => undefined)),
    );
  },

  /** A random ID per install, sent with verify/refresh so refresh tokens are device-bound. */
  async getDeviceId() {
    const existing = await get(KEYS.deviceId);
    if (existing) return existing;
    const id = `dev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    await keychain.set(KEYS.deviceId, id);
    return id;
  },

  /** App lock settings. The PIN is kept in the keychain/keystore, never in plain storage. */
  async getLock(): Promise<{ mode: LockMode; failures: number }> {
    const [mode, failures] = await Promise.all([get(KEYS.lockMode), get(KEYS.lockFailures)]);
    return {
      mode: mode === 'biometric' || mode === 'pin' ? mode : 'off',
      failures: Number(failures ?? 0) || 0,
    };
  },
  async setLock(mode: LockMode, pin?: string) {
    await keychain.set(KEYS.lockMode, mode);
    if (mode === 'pin' && pin) await keychain.set(KEYS.lockPin, pin);
    if (mode !== 'pin') await keychain.remove(KEYS.lockPin).catch(() => undefined);
    await keychain.set(KEYS.lockFailures, '0');
  },
  async checkPin(pin: string) {
    return (await get(KEYS.lockPin)) === pin;
  },
  async setLockFailures(count: number) {
    await keychain.set(KEYS.lockFailures, String(count));
  },

  /** Profile photo picked on this device (upload comes in a later module). */
  getLocalAvatarUri: () => get(KEYS.localAvatarUri),
  async setLocalAvatarUri(uri: string | null) {
    if (uri) await keychain.set(KEYS.localAvatarUri, uri);
    else await keychain.remove(KEYS.localAvatarUri).catch(() => undefined);
  },
};
