import { createApiClient } from '@nexa/api-contract';

import { config } from '@/lib/config';
import { createMockFetch } from '@/mocks/mock-fetch';

/** The app's single API client. In mock mode, requests are answered from src/mocks/fixtures. */
export const api = createApiClient({
  baseUrl: config.apiUrl,
  fetch: config.useMocks
    ? createMockFetch({
        delayMs: config.mockDelayMs,
        failureRate: config.mockFailureRate,
        scenario: config.mockScenario,
      })
    : undefined,
  // TODO(F1): return the access token once auth exists.
  getAccessToken: () => null,
});
