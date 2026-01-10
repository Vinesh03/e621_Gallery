/**
 * API Retry Utility
 * Provides automatic retry logic with exponential backoff for failed API calls
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  shouldRetry: (error: unknown, attempt: number) => {
    // Retry on network errors, 5xx errors, and rate limits
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return true;
      }
    }
    
    // Check if it's a Response object with status code
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status;
      // Retry on 5xx errors and 429 (rate limit)
      if (status >= 500 || status === 429) {
        return true;
      }
    }
    
    // Don't retry after max attempts
    return attempt < DEFAULT_OPTIONS.maxRetries;
  },
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Add jitter (random variation) to prevent thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay;
  
  const totalDelay = exponentialDelay + jitter;
  
  // Cap at maxDelay
  return Math.min(totalDelay, maxDelay);
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @example
 * const data = await withRetry(
 *   () => fetch('https://api.example.com/data').then(r => r.json()),
 *   { maxRetries: 3, onRetry: (err, attempt) => console.log(`Retry ${attempt}`) }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = opts.shouldRetry(error, attempt);
      
      if (!shouldRetry || attempt === opts.maxRetries) {
        throw error;
      }

      // Calculate delay before retry
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(error, attempt + 1);
      }

      console.log(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${Math.round(delay)}ms...`);
      
      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Wrapper for fetch with retry logic
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(input, init);
      
      // Throw error for non-ok responses to trigger retry
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }
      
      return response;
    },
    {
      ...options,
      shouldRetry: (error, attempt) => {
        // Custom retry logic for fetch
        if (typeof error === 'object' && error !== null && 'status' in error) {
          const status = (error as any).status;
          
          // Don't retry 4xx errors (except 429 rate limit)
          if (status >= 400 && status < 500 && status !== 429) {
            return false;
          }
        }
        
        // Use default shouldRetry for other cases
        return DEFAULT_OPTIONS.shouldRetry(error, attempt);
      },
    }
  );
}

/**
 * Rate limiter to prevent too many concurrent requests
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(private maxConcurrent: number = 5) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(5);
