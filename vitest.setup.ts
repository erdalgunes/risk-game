import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi, expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

// Extend Vitest matchers with axe-core
expect.extend(toHaveNoViolations);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Suppress console errors in tests (optional - uncomment if tests are too noisy)
// beforeAll(() => {
//   vi.spyOn(console, 'error').mockImplementation(() => {});
//   vi.spyOn(console, 'warn').mockImplementation(() => {});
// });

// afterAll(() => {
//   vi.restoreAllMocks();
// });
