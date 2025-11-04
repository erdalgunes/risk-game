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
      <body className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <h1 className="text-4xl font-bold mb-4">⚠️</h1>
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-6">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 mb-6 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
            >
              Try again
            </button>
            <a
              href="/"
              className="block w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
            >
              Go to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
