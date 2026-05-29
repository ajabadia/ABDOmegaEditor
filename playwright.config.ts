import { defineConfig, devices } from '@playwright/test';

/**
 * OMEGA ERA 7.2.3 - Playwright Configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential for stability in smoke tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid port/state conflicts during smoke testing
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3100',
  //   reuseExistingServer: !process.env.CI,
  // },
});
