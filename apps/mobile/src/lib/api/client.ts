import { ApiError, createApiClient, isApiError, type FetchLike } from '@nexa/api-contract';

import { secureStorage } from '@/lib/auth/secure-storage';
import { signOutLocally } from '@/lib/auth/sign-out';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import {
  createMockFetch,
  MockAuthServer,
  MockProductServer,
  MockStoreServer,
  setMockLogger,
} from '@nexa/mocks';
import {
  filePersistence,
  secureStorePersistence,
  storesSecureStorePersistence,
} from '@/mocks/persistence';
import { useMockControl } from '@/mocks/mock-control';
import { useAuthStore } from '@/stores/auth-store';

if (config.useMocks) setMockLogger(logger);

/** The fake backend used in mock mode. Its state survives restarts (mock-only storage key). */
export const mockServer = config.useMocks
  ? new MockAuthServer({
      persistence: secureStorePersistence,
      accessTokenTtlSec: config.mockAccessTokenTtlSec,
    })
  : null;

/** The fake stores backend (F2). Resets together with `mockServer`. */
export const mockStores = mockServer
  ? new MockStoreServer({ auth: mockServer, persistence: storesSecureStorePersistence })
  : null;

/** The fake products backend (F4): uploads, scanning, publishing. */
export const mockProducts =
  mockServer && mockStores
    ? new MockProductServer({
        auth: mockServer,
        stores: mockStores,
        persistence: filePersistence('nexa-mock-products-v1.json'),
        scanMs: config.mockDelayMs * 4,
        processMs: config.mockDelayMs * 6,
        rejectRate: () => (useMockControl.getState().filesRejected ? 1 : config.mockFileRejectRate),
      })
    : null;

const transport: FetchLike | undefined = mockServer
  ? createMockFetch({
      delayMs: config.mockDelayMs,
      failureRate: config.mockFailureRate,
      scenario: config.mockScenario,
      server: mockServer,
      stores: mockStores ?? undefined,
      products: mockProducts ?? undefined,
      getFlags: () => useMockControl.getState(),
    })
  : undefined;

/** Client for public endpoints (OTP, refresh, logout). Never attaches or refreshes tokens. */
export const publicApi = createApiClient({ baseUrl: config.apiUrl, fetch: transport });

/**
 * Exchanges the stored refresh token for a new pair.
 * Returns null when the server refuses (session over); throws on network errors so the
 * session survives being offline.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const tokens = await publicApi.refreshSession({
      refreshToken,
      deviceId: await secureStorage.getDeviceId(),
    });
    await useAuthStore.getState().setTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 400)) return null;
    throw error instanceof ApiError
      ? error
      : new ApiError(0, { code: 'NETWORK_ERROR', message: 'Network error' });
  }
}

/** The app's main API client: attaches the access token, refreshes once on 401, retries once. */
export const api = createApiClient({
  baseUrl: config.apiUrl,
  fetch: transport,
  auth: {
    getAccessToken: () => useAuthStore.getState().accessToken,
    refresh: refreshAccessToken,
    onSessionEnded: () => {
      if (useAuthStore.getState().status === 'signedIn') void signOutLocally('expired');
    },
  },
});
