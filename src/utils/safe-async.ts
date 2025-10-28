/**
 * Utility functions for safe async operations
 */

/**
 * Safely executes an async function and handles errors
 * @param asyncFn - The async function to execute
 * @param errorHandler - Optional error handler, defaults to console.error
 */
export function safeAsync<T>(
  asyncFn: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): void {
  const handleError = errorHandler || ((error: unknown) => {
    console.error('Unhandled async error:', error);
  });

  asyncFn().catch(handleError);
}

/**
 * Safely executes an async function with logging
 * @param asyncFn - The async function to execute
 * @param context - Context string for logging
 */
export function safeAsyncWithLog<T>(
  asyncFn: () => Promise<T>,
  context: string
): void {
  safeAsync(asyncFn, (error) => {
    console.error(`Error in ${context}:`, error);
  });
}
