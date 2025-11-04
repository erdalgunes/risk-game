/**
 * Next.js Instrumentation
 *
 * Initializes Sentry on server startup and handles request errors.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * onRequestError Hook
 *
 * Captures unhandled errors in Next.js server requests.
 * Automatically called by Next.js 15 when errors occur during request processing.
 */
export async function onRequestError(
  error: Error,
  request: {
    path: string;
    method: string;
    headers: Headers;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  }
) {
  // Report error to Sentry with request context
  Sentry.captureException(error, {
    contexts: {
      request: {
        url: request.path,
        method: request.method,
      },
      nextjs: {
        router: context.routerKind,
        route_path: context.routePath,
        route_type: context.routeType,
      },
    },
  });
}
