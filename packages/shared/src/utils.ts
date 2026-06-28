// Browser-safe utility functions

/**
 * Delays execution for a given number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parses a JSON string, returning a result type
 */
import { Result, success, failure } from './results.js';

export function safeJsonParse<T>(jsonString: string): Result<T, Error> {
  try {
    const value = JSON.parse(jsonString) as T;
    return success(value);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return failure(error);
  }
}
