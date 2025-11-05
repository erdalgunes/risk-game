import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Production Test Configuration
 *
 * Optimized for testing against deployed production/staging environments.
 * No local dev server, faster execution, Chromium-only for speed.
 *
 * Usage:
 *   playwright test --config=playwright.config.prod.ts
 *   PLAYWRIGHT_BASE_URL=https://your-app.vercel.app playwright test --config=playwright.config.prod.ts
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in parallel for faster execution
  fullyParallel: true,

  // Fail if test.only is left in code
  forbidOnly: !!process.env.CI,

  // No retries for production smoke tests (failures should be investigated immediately)
  retries: 0,

  // Use more workers for faster execution (production has no local dev server startup)
  workers: process.env.CI ? 2 : 4,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report-production' }],
    ['list'],
    process.env.CI ? ['github'] : ['list'],
  ],

  // Global timeout settings
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },

  // Shared settings
  use: {
    // Production URL - override with PLAYWRIGHT_BASE_URL env var
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://risk-red.vercel.app',

    // Capture more data on production for debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Production-specific settings
    actionTimeout: 10000, // 10 seconds for actions
    navigationTimeout: 30000, // 30 seconds for page loads

    // Extra HTTP headers for production testing
    extraHTTPHeaders: {
      'X-Test-Run': 'playwright-production',
    },
  },

  // Test only on Chromium for production smoke tests (fastest)
  // Add more browsers for comprehensive cross-browser testing if needed
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Production viewport
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Uncomment for cross-browser production validation
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile testing
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // NO webServer - testing against deployed production/staging
});
