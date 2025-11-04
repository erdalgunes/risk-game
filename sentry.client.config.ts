/**
 * Sentry Client Configuration
 *
 * Captures client-side errors, unhandled rejections, and performance data.
 * Set NEXT_PUBLIC_SENTRY_DSN in environment variables to enable.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.1, // 10% of transactions

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Replay configuration for session recording
    replaysOnErrorSampleRate: 1.0, // 100% of errors
    replaysSessionSampleRate: 0.1, // 10% of sessions

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Ignore common browser errors that aren't actionable
    ignoreErrors: [
      // Network errors
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'Network request failed',
      // Browser extension errors
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // WebSocket errors (handled by polling fallback)
      'WebSocket',
    ],

    beforeSend(event, hint) {
      // Filter out rate limit errors (expected behavior)
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        if (message.includes('Rate limit exceeded')) {
          return null;
        }
      }
      return event;
    },

    // Environment configuration
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  });
}
