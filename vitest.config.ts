import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      exclude: [
        '**/*.config.ts',
        '**/*.config.js',
        '**/mocks/**',
        '**/factories/**',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
        'tests/**',
        '.next/**'
      ],
      thresholds: {
        lines: 35,
        functions: 35,
        branches: 30,
        statements: 35
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
