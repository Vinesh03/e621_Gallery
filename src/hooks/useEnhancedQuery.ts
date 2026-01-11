import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface EnhancedQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  // Show toast notifications on error
  showErrorToast?: boolean;
  // Custom error message
  errorMessage?: string;
  // Disable automatic retry for this query
  disableRetry?: boolean;
  // Success message to show
  successMessage?: string;
}

type EnhancedQueryResult<TData, TError = Error> = UseQueryResult<TData, TError> & {
  // Network status
  isOffline: boolean;
  // Manual retry function
  retry: () => void;
};

/**
 * Enhanced useQuery hook with better error handling and user feedback
 * 
 * Features:
 * - Automatic error categorization (network, auth, server)
 * - Smart toast notifications
 * - Connection monitoring
 * - Retry with exponential backoff
 * - TypeScript support
 * 
 * @example
 * const { data, isLoading, error, retry } = useEnhancedQuery(
 *   ['posts', tags],
 *   () => e621Api.searchPosts({ tags }),
 *   { 
 *     showErrorToast: true,
 *     staleTime: 5 * 60 * 1000 
 *   }
 * );
 */
export function useEnhancedQuery<TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options: EnhancedQueryOptions<TData, TError> = {}
): EnhancedQueryResult<TData, TError> {
  const {
    showErrorToast = true,
    errorMessage,
    disableRetry = false,
    successMessage,
    ...queryOptions
  } = options;

  // Monitor online/offline status
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Connessione ripristinata!', { duration: 2000 });
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast.warning('Nessuna connessione internet', { duration: 3000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced error categorization
  const categorizeError = (error: any): 'network' | 'auth' | 'server' | 'client' | 'unknown' => {
    if (!error) return 'unknown';

    const errorMessage = error.message?.toLowerCase() || '';
    const status = error.response?.status;

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('cors') ||
      errorMessage.includes('failed to fetch')
    ) {
      return 'network';
    }

    // Auth errors
    if (status === 401 || status === 403) {
      return 'auth';
    }

    // Server errors
    if (status && status >= 500) {
      return 'server';
    }

    // Client errors
    if (status && status >= 400 && status < 500) {
      return 'client';
    }

    return 'unknown';
  };

  // Get user-friendly error message
  const getUserFriendlyMessage = (error: any): string => {
    if (errorMessage) return errorMessage;

    const category = categorizeError(error);

    switch (category) {
      case 'network':
        return 'Problema di connessione. Verifica la tua rete e riprova.';
      case 'auth':
        return 'Sessione scaduta o non autorizzato. Effettua il login.';
      case 'server':
        return 'Il server non è al momento disponibile. Riprova tra poco.';
      case 'client':
        return 'Richiesta non valida. Verifica i parametri.';
      default:
        return 'Si è verificato un errore. Riprova.';
    }
  };

  // Custom retry logic based on error type
  const shouldRetry = (failureCount: number, error: any): boolean => {
    if (disableRetry) return false;

    const category = categorizeError(error);

    // Don't retry auth or client errors
    if (category === 'auth' || category === 'client') {
      return false;
    }

    // Retry network and server errors up to 3 times
    if (category === 'network' || category === 'server') {
      return failureCount < 3;
    }

    // Unknown errors: retry once
    return failureCount < 1;
  };

  const result = useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        const data = await queryFn();
        
        // Show success message if configured
        if (successMessage) {
          toast.success(successMessage);
        }
        
        return data;
      } catch (error) {
        // Show error toast if enabled
        if (showErrorToast) {
          const message = getUserFriendlyMessage(error);
          const category = categorizeError(error);
          
          // Use different toast types based on error category
          if (category === 'network') {
            toast.warning(message, { duration: 4000 });
          } else if (category === 'auth') {
            toast.error(message, { duration: 5000 });
          } else {
            toast.error(message);
          }
        }
        
        throw error;
      }
    },
    retry: shouldRetry,
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s, max 30s
      return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
    },
    ...queryOptions,
  });

  // Enhanced result with additional utilities
  return {
    ...result,
    isOffline,
    retry: () => result.refetch(),
  } as EnhancedQueryResult<TData, TError>;
}

/**
 * Hook to monitor network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.success('✅ Connessione ripristinata!');
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.warning('⚠️ Sei offline. Alcune funzioni potrebbero non essere disponibili.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, isOffline: !isOnline };
}

/**
 * Hook to handle API errors consistently
 */
export function useApiErrorHandler() {
  return (error: any, customMessage?: string) => {
    console.error('API Error:', error);

    const status = error?.response?.status;
    const message = error?.message?.toLowerCase() || '';

    if (customMessage) {
      toast.error(customMessage);
      return;
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      toast.warning('Problema di connessione. Verifica la tua rete.');
      return;
    }

    // HTTP status errors
    if (status === 401) {
      toast.error('Sessione scaduta. Effettua nuovamente il login.');
    } else if (status === 403) {
      toast.error('Non hai i permessi per questa azione.');
    } else if (status === 404) {
      toast.error('Risorsa non trovata.');
    } else if (status === 429) {
      toast.warning('Troppe richieste. Attendi un momento.');
    } else if (status >= 500) {
      toast.error('Errore del server. Riprova tra poco.');
    } else {
      toast.error('Operazione fallita. Riprova.');
    }
  };
}
