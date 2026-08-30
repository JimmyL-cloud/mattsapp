import { defineConfig, devices } from '@playwright/test';

const port = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `node --require ./scripts/memory-usage-shim.cjs ./node_modules/next/dist/bin/next dev -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}/login`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      MATTSAPP_E2E: '1',
      MATTSAPP_OWNER_EMAIL: 'matt@example.test',
      MATTSAPP_E2E_OWNER_PASSWORD: 'local-e2e-password',
      BETTER_AUTH_SECRET: 'local-e2e-only-secret-with-32-characters',
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
    },
  },
});
