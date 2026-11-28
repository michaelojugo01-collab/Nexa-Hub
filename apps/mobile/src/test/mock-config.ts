/**
 * Use with: jest.mock('@/lib/config', () => require('@/test/mock-config'));
 * Turns mock mode on with no delay and a 30-second access token.
 */
export const config = {
  apiUrl: 'https://test.nexahub.ng',
  useMocks: true,
  mockDelayMs: 0,
  mockFailureRate: 0,
  mockAccessTokenTtlSec: 30,
  appLockAfterSec: 300,
  mockScenario: 'default' as const,
};
