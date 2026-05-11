import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['SMOKE_PORT'] ?? 4173);
const BASE_PATH = '/implemment-the-following-time-displaced-ears';

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `PORT=${PORT} node scripts/serve-docs.mjs`,
    url: `http://localhost:${PORT}${BASE_PATH}/`,
    reuseExistingServer: !process.env['CI'],
    timeout: 15_000,
  },
});
