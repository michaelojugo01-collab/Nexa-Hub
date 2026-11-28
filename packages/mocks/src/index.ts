// The mock Nexa Hub backend, shared by the app (EXPO_PUBLIC_USE_MOCKS), the web (USE_MOCKS)
// and tests. Fixtures are plain data typed by the generated API types.
export * from './fixtures';
export {
  DELETION_GRACE_DAYS,
  maskEmail,
  maskPhone,
  MockAuthServer,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_MS,
  OTP_TTL_MS,
  type MockResult,
  type MockServerOptions,
} from './auth/server';
export { MOCK_UPLOAD_ORIGIN, MockStoreServer, type MockStoreServerOptions } from './stores/server';
export {
  createMockServer,
  handleMockRequest,
  type MockFlags,
  type MockRequest,
  type MockResponse,
  type MockScenario,
} from './handlers';
export { createMockFetch, type MockFetchOptions } from './mock-fetch';
export { MockProductServer, type MockProductServerOptions } from './products/server';
export { memoryPersistence, type MockPersistence } from './persistence';
export { setMockLogger, type MockLogger } from './log';
