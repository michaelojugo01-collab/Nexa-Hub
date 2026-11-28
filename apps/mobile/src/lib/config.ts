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
  mockScenario: (process.env.EXPO_PUBLIC_MOCK_SCENARIO === 'empty'
    ? 'empty'
    : 'default') satisfies MockScenario as MockScenario,
} as const;
