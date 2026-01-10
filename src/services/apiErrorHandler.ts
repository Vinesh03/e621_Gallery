/**
 * Centralized API Error Handler
 * 
 * Provides consistent error handling across all API services
 * with proper categorization, user-friendly messages, and retry logic.
 */

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface ApiErrorInfo {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number; // seconds
  originalError: any;
}

/**
 * Custom API Error class with enhanced information
 */
export class ApiError extends Error {
  public readonly category: ErrorCategory;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly userMessage: string;
  public readonly originalError: any;

  constructor(info: ApiErrorInfo) {
    super(info.message);
    this.name = 'ApiError';
    this.category = info.category;
    this.statusCode = info.statusCode;
    this.retryable = info.retryable;
    this.retryAfter = info.retryAfter;
    this.userMessage = info.userMessage;
    this.originalError = info.originalError;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Analyze and categorize API errors
 */
export function analyzeError(error: any): ApiErrorInfo {
  // Extract error information
  const statusCode = error?.response?.status || error?.status;
  const errorMessage = error?.message || '';
  const errorData = error?.response?.data;
  
  // Check for network errors
  if (
    !statusCode &&
    (errorMessage.toLowerCase().includes('network') ||
      errorMessage.toLowerCase().includes('fetch') ||
      errorMessage.toLowerCase().includes('failed to fetch') ||
      errorMessage.toLowerCase().includes('connection') ||
      errorMessage.toLowerCase().includes('timeout'))
  ) {
    return {
      category: ErrorCategory.NETWORK,
      message: 'Network error: Unable to reach server',
      userMessage: 'Problema di connessione. Verifica la tua rete e riprova.',
      retryable: true,
      originalError: error,
    };
  }

  // Categorize by HTTP status code
  switch (statusCode) {
    case 400:
      return {
        category: ErrorCategory.VALIDATION,
        message: 'Bad Request: Invalid parameters',
        userMessage: 'Richiesta non valida. Verifica i parametri inseriti.',
        statusCode,
        retryable: false,
        originalError: error,
      };

    case 401:
      return {
        category: ErrorCategory.AUTH,
        message: 'Unauthorized: Authentication required',
        userMessage: 'Sessione scaduta. Effettua nuovamente il login.',
        statusCode,
        retryable: false,
        originalError: error,
      };

    case 403:
      return {
        category: ErrorCategory.PERMISSION,
        message: 'Forbidden: Insufficient permissions',
        userMessage: 'Non hai i permessi necessari per questa azione.',
        statusCode,
        retryable: false,
        originalError: error,
      };

    case 404:
      return {
        category: ErrorCategory.NOT_FOUND,
        message: 'Not Found: Resource does not exist',
        userMessage: 'Contenuto non trovato.',
        statusCode,
        retryable: false,
        originalError: error,
      };

    case 429: {
      // Parse Retry-After header if available
      const retryAfter = error?.response?.headers?.['retry-after'];
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;

      return {
        category: ErrorCategory.RATE_LIMIT,
        message: 'Rate Limit: Too many requests',
        userMessage: `Troppe richieste. Attendi ${retrySeconds} secondi.`,
        statusCode,
        retryable: true,
        retryAfter: retrySeconds,
        originalError: error,
      };
    }

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        category: ErrorCategory.SERVER,
        message: `Server Error: ${statusCode}`,
        userMessage: 'Il server non è al momento disponibile. Riprova tra poco.',
        statusCode,
        retryable: true,
        originalError: error,
      };

    default:
      return {
        category: ErrorCategory.UNKNOWN,
        message: errorMessage || 'Unknown error occurred',
        userMessage: 'Si è verificato un errore imprevisto. Riprova.',
        statusCode,
        retryable: false,
        originalError: error,
      };
  }
}

/**
 * Handle API error and throw ApiError
 */
export function handleApiError(error: any): never {
  const errorInfo = analyzeError(error);
  throw new ApiError(errorInfo);
}

/**
 * Wrapper for API calls with automatic error handling
 */
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    // Log error with context for debugging
    if (context) {
      console.error(`[API Error - ${context}]:`, error);
    }
    
    handleApiError(error);
  }
}

/**
 * Check if error should be retried
 */
export function shouldRetryError(error: any, attemptCount: number, maxRetries = 3): boolean {
  if (attemptCount >= maxRetries) return false;

  if (error instanceof ApiError) {
    return error.retryable;
  }

  const errorInfo = analyzeError(error);
  return errorInfo.retryable;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attemptCount: number, error?: any): number {
  // If rate limited, use retry-after value
  if (error instanceof ApiError && error.category === ErrorCategory.RATE_LIMIT && error.retryAfter) {
    return error.retryAfter * 1000; // Convert to milliseconds
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  const baseDelay = 1000;
  const exponentialDelay = baseDelay * Math.pow(2, attemptCount);
  const maxDelay = 30000;

  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Execute API call with automatic retry logic
 */
export async function executeWithRetry<T>(
  apiCall: () => Promise<T>,
  options: {
    maxRetries?: number;
    context?: string;
    onRetry?: (attemptCount: number, error: any) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, context, onRetry } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withErrorHandling(apiCall, context);
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetryError(error, attempt, maxRetries)) {
        throw error;
      }

      // Calculate delay
      const delay = getRetryDelay(attempt, error);

      // Notify about retry
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      console.log(`[Retry ${attempt + 1}/${maxRetries}] Retrying after ${delay}ms...`);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Log error for tracking/analytics
 */
export function logError(error: any, context?: string) {
  const errorInfo = error instanceof ApiError ? error : analyzeError(error);

  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    category: errorInfo.category || error.category,
    message: errorInfo.message || error.message,
    statusCode: errorInfo.statusCode || error.statusCode,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[Error Log]:', logEntry);
  }

  // In production, send to error tracking service
  // Example: Sentry, LogRocket, custom backend
  try {
    const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
    existingLogs.push(logEntry);
    
    // Keep only last 50 errors
    const recentLogs = existingLogs.slice(-50);
    localStorage.setItem('error_logs', JSON.stringify(recentLogs));
  } catch (e) {
    console.error('Failed to save error log:', e);
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: any): string {
  if (error instanceof ApiError) {
    return error.userMessage;
  }

  const errorInfo = analyzeError(error);
  return errorInfo.userMessage;
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: any): boolean {
  if (error instanceof ApiError) {
    return error.retryable;
  }

  const errorInfo = analyzeError(error);
  return errorInfo.retryable;
}
