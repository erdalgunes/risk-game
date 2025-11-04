/**
 * Retry utility for handling transient network failures
 *
 * Implements exponential backoff with jitter to prevent thundering herd problem
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  /** Add random jitter (0-20% of delay) to prevent thundering herd */
  jitter?: boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  jitter: true,
  onRetry: () => {},
};

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all attempts fail
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Call onRetry callback
      config.onRetry(lastError, attempt);

      // Calculate delay with exponential backoff
      let delay = Math.min(
        config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );

      // Add jitter to prevent thundering herd (0-20% random variance)
      if (config.jitter) {
        const jitterAmount = delay * 0.2 * Math.random();
        delay = Math.floor(delay + jitterAmount);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry with specific error type filtering
 * Only retries if the error matches the filter
 */
export async function retryOnError<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (!shouldRetry(lastError) || attempt === config.maxAttempts) {
        break;
      }

      config.onRetry(lastError, attempt);

      let delay = Math.min(
        config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );

      // Add jitter to prevent thundering herd (0-20% random variance)
      if (config.jitter) {
        const jitterAmount = delay * 0.2 * Math.random();
        delay = Math.floor(delay + jitterAmount);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Helper to check if error is a network error
 */
export function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    error.name === 'NetworkError' ||
    error.name === 'TimeoutError'
  );
}

/**
 * Helper to check if error is retryable (5xx or network errors)
 */
export function isRetryableError(error: Error): boolean {
  if (isNetworkError(error)) {
    return true;
  }

  // Check for HTTP status codes
  const match = error.message.match(/status:?\s*(\d{3})/i);
  if (match) {
    const status = parseInt(match[1], 10);
    // Retry on 5xx server errors and 429 rate limit
    return status >= 500 || status === 429;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
