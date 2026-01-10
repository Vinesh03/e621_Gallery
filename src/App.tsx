import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { useAuthStore, initializeTheme } from "@/stores/appStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";

const LoginPage = React.lazy(() => import("@/pages/LoginPage"));
const GalleryPage = React.lazy(() => import("@/pages/GalleryPage"));
const FavoritesPage = React.lazy(() => import("@/pages/FavoritesPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/gallery", element: <GalleryPageWithProtect /> },
  { path: "/favorites", element: <FavoritesPageWithProtect /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/", element: <Navigate to="/gallery" replace /> },
  { path: "*", element: <NotFound /> },
]);

/**
 * Enhanced QueryClient configuration with optimized settings
 * - Smart caching strategies for different data types
 * - Automatic retry with exponential backoff
 * - Error handling based on error types
 * - Mobile-optimized defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults for all queries
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cached data lifetime (formerly cacheTime)
      
      // Retry configuration with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors, auth issues)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times for network/server errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Max 30s
      
      // Network mode - fetch from network, fallback to cache if offline
      networkMode: 'online',
      
      // Refetch configuration
      refetchOnWindowFocus: false, // Disable for mobile (battery optimization)
      refetchOnReconnect: true, // Refetch when connection restored
      refetchOnMount: false, // Use cached data on component mount
      
      // Error handling
      throwOnError: false, // Prevent unhandled promise rejections
      
      // Mobile optimization
      structuralSharing: true, // Enable structural sharing for better memory usage
    },
    mutations: {
      // Retry mutations once (for favorites, votes, etc.)
      retry: 1,
      retryDelay: 1000,
      
      // Network mode
      networkMode: 'online',
      
      // Error handling for mutations
      onError: (error: any) => {
        console.error('Mutation error:', error);
        
        // User-friendly error messages
        if (error?.response?.status === 401) {
          toast.error('Sessione scaduta. Effettua nuovamente il login.');
        } else if (error?.response?.status === 403) {
          toast.error('Non hai i permessi per questa azione.');
        } else if (error?.response?.status >= 500) {
          toast.error('Errore del server. Riprova tra poco.');
        } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
          toast.error('Problema di connessione. Verifica la tua rete.');
        } else {
          toast.error('Operazione fallita. Riprova.');
        }
      },
    },
  },
});

/**
 * Custom query key factories for better cache management
 * These help organize and invalidate cache more efficiently
 */
export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.posts.details(), id] as const,
  },
  tags: {
    all: ['tags'] as const,
    search: (query: string) => [...queryKeys.tags.all, 'search', query] as const,
  },
  user: {
    all: ['user'] as const,
    current: () => [...queryKeys.user.all, 'current'] as const,
    favorites: (username: string) => [...queryKeys.user.all, 'favorites', username] as const,
  },
};

// Initialize theme immediately on app start
initializeTheme();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { credentials, isGuest } = useAuthStore();
  if (!credentials && !isGuest) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function GalleryPageWithProtect() {
  return (
    <ProtectedRoute>
      <GalleryPage />
    </ProtectedRoute>
  );
}

function FavoritesPageWithProtect() {
  return (
    <ProtectedRoute>
      <FavoritesPage />
    </ProtectedRoute>
  );
}

/**
 * Enhanced loading fallback with better UX
 */
const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-muted-foreground animate-pulse">Caricamento...</p>
    </div>
  </div>
);

/**
 * Main App component with enhanced error handling and caching
 */
const App = () => {
  return (
    <ErrorBoundary
      maxRetries={3}
      onError={(error, errorInfo) => {
        // Custom error tracking (can integrate with Sentry, LogRocket, etc.)
        console.error('App-level error caught:', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster 
            position="top-center"
            expand={false}
            richColors
            closeButton
          />
          <Suspense fallback={<LoadingFallback />}>
            <RouterProvider router={router} />
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
export { queryClient, queryKeys };
