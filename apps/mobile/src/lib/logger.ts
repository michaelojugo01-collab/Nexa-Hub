import { config } from './config';

/**
 * App logger. `sensitive` values (OTP codes, tokens, phone numbers) are only ever printed in
 * mock mode. Never pass secrets to `info` or `warn`.
 */
export const logger = {
  info: (...args: unknown[]) => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn(...args);
  },
  /** Only prints when EXPO_PUBLIC_USE_MOCKS=true. */
  sensitive: (...args: unknown[]) => {
    if (config.useMocks && process.env.NODE_ENV !== 'test') console.log('[mock]', ...args);
  },
};
