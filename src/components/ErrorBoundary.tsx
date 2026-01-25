import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorTimestamp: number;
}

/**
 * Enhanced Global Error Boundary Component
 * - Catches React errors and prevents app crashes
 * - Automatic retry mechanism for transient errors
 * - Error tracking and logging
 * - User-friendly error messages and recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorTimestamp: Date.now(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorTimestamp: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    // Log error details for debugging
    console.error('🔴 ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      retryCount,
    });
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (e) {
        console.error('Error handler itself threw an error:', e);
      }
    }

    // Track error occurrence
    this.trackError(error, errorInfo);

    // Attempt automatic recovery for certain errors
    if (this.shouldAutoRetry(error) && retryCount < maxRetries) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Determines if the error should trigger an automatic retry
   */
  private shouldAutoRetry(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Retry for network-related errors
    const networkErrors = [
      'network',
      'fetch',
      'timeout',
      'connection',
      'cors',
      'load failed',
    ];

    return networkErrors.some(keyword => message.includes(keyword));
  }

  /**
   * Schedule an automatic retry with exponential backoff
   */
  private scheduleRetry() {
    const { retryCount } = this.state;
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s

    console.log(`⏱️ Scheduling automatic retry in ${delay}ms (attempt ${retryCount + 1})`);
    
    toast.info(`Riprovo automaticamente tra ${Math.round(delay / 1000)}s...`, {
      duration: delay,
    });

    this.retryTimeoutId = setTimeout(() => {
      this.handleAutoRetry();
    }, delay);
  }

  /**
   * Execute automatic retry
   */
  private handleAutoRetry = () => {
    const { retryCount } = this.state;
    
    console.log(`🔄 Executing automatic retry (attempt ${retryCount + 1})`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  /**
   * Track error for analytics/monitoring
   */
  private trackError(error: Error, errorInfo: ErrorInfo) {
    try {
      // Store error in localStorage for debugging
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const existingErrors = this.getErrorLog();
      existingErrors.push(errorLog);
      
      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10);
      
      localStorage.setItem('error_log', JSON.stringify(recentErrors));

      // In production, you would send this to an error tracking service
      // Example: Sentry, LogRocket, or custom backend
      if (process.env.NODE_ENV === 'production') {
        // this.sendToErrorTracking(errorLog);
      }
    } catch (e) {
      console.error('Failed to track error:', e);
    }
  }

  /**
   * Get error log from localStorage
   */
  private getErrorLog(): Array<any> {
    try {
      const log = localStorage.getItem('error_log');
      return log ? JSON.parse(log) : [];
    } catch {
      return [];
    }
  }

  /**
   * Send error log to support
   */
  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    const errorLog = this.getErrorLog();
    
    const reportData = {
      currentError: {
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
      },
      recentErrors: errorLog,
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        url: window.location.href,
      },
    };

    const reportText = JSON.stringify(reportData, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(reportText).then(() => {
      toast.success('Report copiato negli appunti! Puoi inviarlo al supporto.');
    }).catch(() => {
      toast.error('Impossibile copiare il report');
    });
  };

  /**
   * Manual reset with full state cleanup
   */
  handleReset = () => {
    console.log('🔄 Manual reset triggered');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorTimestamp: Date.now(),
    });
  };

  /**
   * Full page reload
   */
  handleReload = () => {
    console.log('🔃 Full page reload triggered');
    window.location.reload();
  };

  /**
   * Navigate to home
   */
  handleGoHome = () => {
    console.log('🏠 Navigating to home');
    window.location.href = '/gallery';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, retryCount } = this.state;
      const { maxRetries = 3 } = this.props;
      const canRetry = retryCount < maxRetries;

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Oops! Qualcosa è andato storto
              </h1>
              <p className="text-muted-foreground">
                Si è verificato un errore inaspettato. Non preoccuparti, i tuoi dati sono al sicuro.
              </p>
              {canRetry && (
                <p className="text-sm text-muted-foreground">
                  Tentativo automatico di recupero in corso...
                </p>
              )}
            </div>

            {retryCount > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  Tentativo di recupero: {retryCount} / {maxRetries}
                </p>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Dettagli tecnici (dev mode)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-48">
                  <p className="font-semibold text-destructive mb-2">
                    {error.toString()}
                  </p>
                  {errorInfo && (
                    <pre className="text-muted-foreground whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={this.handleReset}
                className="w-full"
                size="lg"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Riprova
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                
                <Button
                  onClick={this.handleReportError}
                  variant="outline"
                  className="w-full"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Report
                </Button>
              </div>
              
              <Button
                onClick={this.handleReload}
                variant="ghost"
                className="w-full"
                size="sm"
              >
                Ricarica l'app
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Se il problema persiste, prova a cancellare la cache dell'app.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to manually trigger error boundary
 * Useful for async errors that don't naturally bubble up
 */
export const useErrorHandler = () => {
  const [, setError] = React.useState();

  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
};

/**
 * HOC to wrap async functions with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  onError?: (error: Error) => void
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Async error caught by withErrorHandler:', error);
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  }) as T;
}
