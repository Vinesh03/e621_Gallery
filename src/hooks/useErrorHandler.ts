import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  /** Show a toast notification for errors */
  showToast?: boolean;
  /** Custom error message to display */
  message?: string;
  /** Callback to execute on error */
  onError?: (error: Error) => void;
  /** Whether to log errors to console */
  logToConsole?: boolean;
  /** Retry the failed operation automatically */
  retry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
}

/**
 * Custom hook for advanced error handling
 * Provides retry logic, toast notifications, and error tracking
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showToast = true,
    message,
    onError,
    logToConsole = true,
    retry = false,
    maxRetries = 3,
  } = options;

  const retriesRef = useRef(0);
  const lastErrorRef = useRef<Error | null>(null);

  /**
   * Handle an error with configured options
   */
  const handleError = useCallback(
    (error: Error | unknown, context?: string) => {
      const err = error instanceof Error ? error : new Error(String(error));
      lastErrorRef.current = err;

      // Log to console if enabled
      if (logToConsole) {
        console.error(`[Error${context ? ` in ${context}` : ''}]:`, err);
      }

      // Show toast notification
      if (showToast) {
        const errorMessage =
          message ||
          (err.message.includes('fetch') || err.message.includes('network')
            ? 'Errore di connessione. Verifica la tua rete.'
            : err.message || 'Si è verificato un errore');

        toast.error(errorMessage, {
          description: context,
          action: retry
            ? {
                label: 'Riprova',
                onClick: () => {
                  if (retriesRef.current < maxRetries) {
                    retriesRef.current++;
                    // The actual retry logic should be handled by the caller
                  } else {
                    toast.error('Numero massimo di tentativi raggiunto');
                  }
                },
              }
            : undefined,
        });
      }

      // Execute custom error callback
      if (onError) {
        try {
          onError(err);
        } catch (callbackError) {
          console.error('Error in error handler callback:', callbackError);
        }
      }

      return err;
    },
    [showToast, message, onError, logToConsole, retry, maxRetries]
  );

  /**
   * Wrap an async function with error handling
   */
  const wrapAsync = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      context?: string
    ): ((...args: Parameters<T>) => Promise<ReturnType<T> | null>) => {
      return async (...args: Parameters<T>) => {
        try {
          return await fn(...args);
        } catch (error) {
          handleError(error, context);
          return null;
        }
      };
    },
    [handleError]
  );

  /**
   * Execute a function with automatic retry on failure
   */
  const executeWithRetry = useCallback(
    async <T>(
      fn: () => Promise<T>,
      context?: string,
      customMaxRetries?: number
    ): Promise<T | null> => {
      const retries = customMaxRetries ?? maxRetries;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await fn();
          retriesRef.current = 0; // Reset on success
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (logToConsole) {
            console.warn(
              `Attempt ${attempt + 1}/${retries + 1} failed${context ? ` in ${context}` : ''}:`,
              lastError
            );
          }

          if (attempt < retries) {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      if (lastError) {
        handleError(lastError, context);
      }

      return null;
    },
    [maxRetries, logToConsole, handleError]
  );

  /**
   * Get the last error that occurred
   */
  const getLastError = useCallback(() => lastErrorRef.current, []);

  /**
   * Clear the last error
   */
  const clearError = useCallback(() => {
    lastErrorRef.current = null;
    retriesRef.current = 0;
  }, []);

  /**
   * Reset retry counter
   */
  const resetRetries = useCallback(() => {
    retriesRef.current = 0;
  }, []);

  return {
    handleError,
    wrapAsync,
    executeWithRetry,
    getLastError,
    clearError,
    resetRetries,
  };
}

/**
 * Hook for handling errors in React Query
 */
export function useQueryErrorHandler() {
  const { handleError } = useErrorHandler({
    showToast: true,
    logToConsole: true,
  });

  return useCallback(
    (error: Error | unknown) => {
      handleError(error, 'Query Error');
    },
    [handleError]
  );
}

/**
 * Hook for handling errors in mutations
 */
export function useMutationErrorHandler() {
  const { handleError } = useErrorHandler({
    showToast: true,
    logToConsole: true,
  });

  return useCallback(
    (error: Error | unknown, context?: string) => {
      handleError(error, context || 'Mutation Error');
    },
    [handleError]
  );
}

/**
 * Global error event listener
 * Catches unhandled promise rejections and runtime errors
 */
export function useGlobalErrorHandler() {
  const { handleError } = useErrorHandler({
    showToast: false, // Don't show toast for global errors to avoid spam
    logToConsole: true,
  });

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      handleError(event.reason, 'Unhandled Promise Rejection');
    };

    const handleError = (event: ErrorEvent) => {
      event.preventDefault();
      handleError(event.error || event.message, 'Runtime Error');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleError]);
}
