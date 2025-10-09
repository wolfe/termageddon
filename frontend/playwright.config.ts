import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: false, // Disabled for test isolation
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use single worker for test isolation */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Expectation timeout settings */
  expect: {
    timeout: 10000, // 10 seconds for more reliable tests
  },

  /* Global test timeout */
  timeout: 30000, // 30 seconds per test

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: [
  //   {
  //     command: 'npm run start',
  //     url: 'http://localhost:4200',
  //     reuseExistingServer: true,
  //     timeout: 120 * 1000,
  //   },
  //   {
  //     command: 'cd ../backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python manage.py runserver 8000',
  //     url: 'http://localhost:8000',
  //     reuseExistingServer: true,
  //     timeout: 120 * 1000,
  //   },
  // ],
});
