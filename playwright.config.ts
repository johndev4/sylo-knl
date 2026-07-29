import dotenv from 'dotenv';
import path from 'path';

// Load .env.test to override/supplement configuration for tests
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    actionTimeout: 10_000,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
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
