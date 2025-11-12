import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./apps/web/src/test/setup.ts'],
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