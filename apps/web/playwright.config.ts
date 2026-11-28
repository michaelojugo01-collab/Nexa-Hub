import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test against the production build (`pnpm build` first). Uses the Chromium that
 * matches @playwright/test 1.63.0.
 */
const PORT = 3100;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off' },
  webServer: {
    command: `next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'], browserName: 'chromium' } },
  ],
});
