/** Logging for the fake servers. Quiet by default; the app plugs in its own logger. */
export type MockLogger = {
  /** OTP codes and similar: only ever printed in mock mode. */
  sensitive: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

const quiet: MockLogger = { sensitive: () => {}, warn: () => {} };

export let mockLog: MockLogger = quiet;

export function setMockLogger(logger: MockLogger) {
  mockLog = logger;
}
