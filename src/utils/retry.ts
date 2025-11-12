/**
 * Retry Utility
 *
 * Provides retry logic for transient failures in database and API operations.
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff?: boolean;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Optional callback for retry attempts */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns Result of the operation
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await database.query(...),
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 1000,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    exponentialBackoff = true,
    maxDelayMs = 10000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = exponentialBackoff
        ? Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs)
        : initialDelayMs;

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries failed, throw the last error
  throw lastError!;
}

/**
 * Determine if an error is retryable
 *
 * @param error - The error to check
 * @returns True if the error is likely transient and worth retrying
 */
export function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'network',
    'timeout',
    'connection',
    'PGRST301', // Supabase timeout
    'PGRST504', // Supabase gateway timeout
  ];

  const errorMessage = error.message.toLowerCase();

  return retryableMessages.some((msg) =>
    errorMessage.includes(msg.toLowerCase())
  );
}

/**
 * Retry a function only if the error is retryable
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns Result of the operation
 * @throws Error if non-retryable or all retries fail
 */
export async function withConditionalRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await withRetry(operation, {
      ...options,
      onRetry: (attempt, error) => {
        // Only retry if error is retryable
        if (!isRetryableError(error)) {
          throw error;
        }
        // Call user's onRetry callback if provided
        if (options.onRetry) {
          options.onRetry(attempt, error);
        }
      },
    });
  } catch (error) {
    throw error;
  }
}
