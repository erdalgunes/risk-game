import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['e2e/**/*.test.ts'],
    // E2E configuration - requires @vitest/browser or playwright setup
    // For now, this serves as a placeholder for future E2E implementation
  }
});