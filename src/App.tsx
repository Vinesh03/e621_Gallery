import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { useAuthStore, useSettingsStore, initializeTheme } from "@/stores/appStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

// Enhanced QueryClient configuration for better reliability and performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 404s or auth errors
        if (error?.status === 404 || error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Caching configuration
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache time (formerly cacheTime)
      
      // Refetch configuration
      refetchOnWindowFocus: false, // Don't refetch on window focus (mobile optimization)
      refetchOnReconnect: true, // Refetch when connection is restored
      refetchOnMount: false, // Don't refetch if data exists
      
      // Network mode
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      // Retry mutations with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'online',
    },
  },
});

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

// Loading fallback with better UX
const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-muted-foreground">Caricamento...</p>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary maxRetries={3}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={<LoadingFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
