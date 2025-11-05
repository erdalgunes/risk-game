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
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/playwright*.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      exclude: [
        '**/*.config.ts',
        '**/*.config.js',
        '**/*.config.mjs',
        '**/*.d.ts',
        '**/mocks/**',
        '**/factories/**',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
        'tests/**',
        '.next/**',
        '**/instrumentation.ts',
        'app/layout.tsx',
        'app/global-error.tsx',
        'app/page.tsx',
        'app/**/page.tsx',
        'app/**/route.ts',
        'scripts/**',
        'public/**',
        'components/ErrorBoundary.tsx',
        'components/SkipLink.tsx',
        'components/game/GameModal.tsx',
        'components/game/RiskMap.tsx',
        'lib/hooks/useGameState.ts',
        'lib/session/**',
        'lib/monitoring/**',
        'lib/middleware/**',
        'lib/supabase/queries.ts',
        'lib/supabase/server.ts',
        'lib/utils/rate-limiter.ts',
        'lib/utils/retry.ts',
        'lib/validation/profanity-filter.ts',
        'types/**'
      ],
      thresholds: {
        lines: 60,
        functions: 65,
        branches: 75,
        statements: 60
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
