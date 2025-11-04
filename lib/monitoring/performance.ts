/**
 * Database query performance monitoring
 *
 * Tracks slow queries and provides metrics for optimization.
 * Integrates with Sentry for production monitoring.
 */

import * as Sentry from '@sentry/nextjs';

export interface QueryMetrics {
  operation: string;
  table: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

// Threshold for slow query warning (ms)
const SLOW_QUERY_THRESHOLD = 1000; // 1 second

/**
 * Wrap a Supabase query with performance monitoring
 *
 * @param operation - Operation name (e.g., 'select', 'insert', 'update')
 * @param table - Table name
 * @param queryFn - Async function that executes the query
 * @returns Query result
 */
export async function monitorQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const timestamp = Date.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    // Log metrics
    const metrics: QueryMetrics = {
      operation,
      table,
      duration,
      success: true,
      timestamp,
    };

    logQueryMetrics(metrics);

    // Send to Sentry if slow query
    if (duration > SLOW_QUERY_THRESHOLD) {
      Sentry.captureMessage(`Slow query detected: ${table}.${operation}`, {
        level: 'warning',
        tags: {
          operation,
          table,
        },
        extra: {
          duration,
          threshold: SLOW_QUERY_THRESHOLD,
        },
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error metrics
    const metrics: QueryMetrics = {
      operation,
      table,
      duration,
      success: false,
      error: errorMessage,
      timestamp,
    };

    logQueryMetrics(metrics);

    // Send to Sentry
    Sentry.captureException(error, {
      tags: {
        operation,
        table,
      },
      extra: {
        duration,
      },
    });

    throw error;
  }
}

/**
 * Log query metrics to console in development
 */
function logQueryMetrics(metrics: QueryMetrics): void {
  if (process.env.NODE_ENV === 'development') {
    const { operation, table, duration, success, error } = metrics;
    const emoji = success ? '✅' : '❌';
    const slowWarning = duration > SLOW_QUERY_THRESHOLD ? ' ⚠️ SLOW' : '';

    console.log(
      `${emoji} DB Query: ${table}.${operation} (${duration.toFixed(2)}ms)${slowWarning}${
        error ? ` - ${error}` : ''
      }`
    );
  }
}

/**
 * Create a transaction span for Sentry APM
 *
 * @param operation - Operation name
 * @param callback - Function to execute within the span
 * @returns Result of the callback
 */
export async function withPerformanceMonitoring<T>(
  operation: string,
  callback: () => Promise<T>
): Promise<T> {
  // Sentry APM span (requires startTransaction from @sentry/tracing)
  // For now, we just use monitorQuery which integrates with Sentry
  return callback();
}
