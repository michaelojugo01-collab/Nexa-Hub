import type { MockScenario } from '@/mocks/handlers';

// EXPO_PUBLIC_* values are inlined at build time. They are NOT secret: never put keys here.
// Each must be read as a literal `process.env.EXPO_PUBLIC_X` for Expo to inline it.

function toNumber(value: string | undefined, fallback: number) {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
}

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://staging-api.nexahub.ng',
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS === 'true',
  mockDelayMs: toNumber(process.env.EXPO_PUBLIC_MOCK_DELAY_MS, 800),
  mockFailureRate: Math.min(1, Math.max(0, toNumber(process.env.EXPO_PUBLIC_MOCK_FAILURE_RATE, 0))),
  /** Access-token lifetime in mock mode. Set to 30 to test silent refresh quickly. */
  mockAccessTokenTtlSec: Math.max(
    5,
    toNumber(process.env.EXPO_PUBLIC_MOCK_ACCESS_TOKEN_TTL_SEC, 900),
  ),
  /** Lock the app when it returns from the background after this many seconds (spec: 5 min). */
  appLockAfterSec: Math.max(0, toNumber(process.env.EXPO_PUBLIC_APP_LOCK_AFTER_SEC, 300)),
  mockScenario: (process.env.EXPO_PUBLIC_MOCK_SCENARIO === 'empty'
    ? 'empty'
    : 'default') satisfies MockScenario as MockScenario,
} as const;
