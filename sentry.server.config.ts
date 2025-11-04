/**
 * Sentry Server Configuration
 *
 * Captures server-side errors, API route errors, and performance data.
 * Set SENTRY_DSN in environment variables to enable.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.1, // 10% of transactions

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Ignore common errors that aren't actionable
    ignoreErrors: [
      // Database connection errors (Supabase handles these)
      'PGRST',
      // Rate limit errors (expected behavior)
      'Rate limit exceeded',
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
    environment: process.env.VERCEL_ENV || 'development',

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}
