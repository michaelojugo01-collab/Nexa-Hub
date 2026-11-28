import { createApiClient } from '@nexa/api-contract';

import { config } from '@/lib/config';
import { MockAuthServer } from '@/mocks/auth/server';
import { secureStorePersistence } from '@/mocks/auth/persistence';
import { useMockControl } from '@/mocks/mock-control';
import { createMockFetch } from '@/mocks/mock-fetch';

/** The fake backend used in mock mode. Its state survives restarts (mock-only storage key). */
export const mockServer = config.useMocks
  ? new MockAuthServer({
      persistence: secureStorePersistence,
      accessTokenTtlSec: config.mockAccessTokenTtlSec,
    })
  : null;

/** The app's single API client. In mock mode, requests are answered by src/mocks. */
export const api = createApiClient({
  baseUrl: config.apiUrl,
  fetch: mockServer
    ? createMockFetch({
        delayMs: config.mockDelayMs,
        failureRate: config.mockFailureRate,
        scenario: config.mockScenario,
        server: mockServer,
        getFlags: () => useMockControl.getState(),
      })
    : undefined,
});
