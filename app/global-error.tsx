'use client';

/**
 * Global Error Boundary
 *
 * Catches unhandled errors in the root layout and reports to Sentry.
 * Required for Next.js 15 App Router error tracking.
 * https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={inter.className}>
      <body className="flex min-h-screen items-center justify-center bg-gray-900 p-4 text-white">
        <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
          <h1 className="mb-4 text-4xl font-bold">⚠️</h1>
          <h2 className="mb-4 text-2xl font-bold">Something went wrong</h2>
          <p className="mb-6 text-gray-400">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="mb-6 font-mono text-sm text-gray-500">Error ID: {error.digest}</p>
          )}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700"
            >
              Try again
            </button>
            <a
              href="/"
              className="block w-full rounded-lg bg-gray-700 px-6 py-3 font-semibold transition hover:bg-gray-600"
            >
              Go to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
