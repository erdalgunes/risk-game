import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/game-engine/src/**/*.test.ts', 'apps/web/src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/__fixtures__/**'
      ],
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80
        },
        'packages/game-engine/src/': {
          lines: 85,
          functions: 85,
          branches: 75,
          statements: 85
        }
      }
    }
  }
});