import dotenv from 'dotenv';
import path from 'path';

// Load .env.test to override/supplement configuration for tests
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const webServerCommand = 'npm run build && npm start';

console.log(
  `Playwright running in CI: ${isCI}, webServerCommand: ${webServerCommand}`
);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    actionTimeout: 10_000,
    trace: 'on-first-retry',
  },
  webServer: {
    command: webServerCommand,
    port: 3000,
    reuseExistingServer: !isCI,
    // Note: Local 'npm run dev' and 'npm run build && npm start' reads this instantly.
    // 'npm start' needs this to match what was set during the build step.
    env: {
      NEXT_PUBLIC_TEST_MODE: 'true',
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium-documents',
      testMatch: /.*documents\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
        launchOptions: { slowMo: 1000 },
      },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-chat',
      testMatch: /.*chat\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
        launchOptions: { slowMo: 1000 },
      },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-library-invites',
      testMatch: /.*library-invites\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
        launchOptions: { slowMo: 1000 },
      },
      dependencies: ['setup'],
    },
  ],
});
