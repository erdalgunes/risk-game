import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load test environment variables from .env.test
const envPath = resolve(__dirname, '.env.test');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#][^=]+)=(.+)$/);
  if (match) {
    const [, key, value] = match;
    envVars[key.trim()] = value.trim();
  }
});

/**
 * Playwright Test Configuration - Test Environment
 *
 * This config is used for testing against local Supabase or test database.
 * Run with: npm run test:e2e:local
 *
 * Prerequisites:
 * 1. Start local Supabase: `supabase start`
 * 2. Run migrations: `supabase db reset`
 * 3. Start dev server: `npm run dev`
 * 4. Run tests: `npm run test:e2e:local`
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests once in test environment
  retries: 1,

  // Use fewer workers for test environment to avoid race conditions
  workers: 2,

  // Reporter to use
  reporter: [['html', { outputFolder: 'playwright-report-test' }], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL for test environment
    baseURL: 'http://localhost:3000',

    // Collect trace on retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Longer timeout for local Supabase operations
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Test timeout (60s for real-time features)
  timeout: 60000,
  expect: {
    timeout: 15000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Mobile testing (optional)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    env: {
      // Pass test environment variables to dev server
      ...envVars,
    },
  },
});
