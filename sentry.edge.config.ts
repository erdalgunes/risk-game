/**
 * Sentry Edge Runtime Configuration
 *
 * Captures errors in Edge runtime (middleware, edge functions).
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

    // Environment configuration
    environment: process.env.VERCEL_ENV || 'development',

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}
