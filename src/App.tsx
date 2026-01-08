import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { useAuthStore, useSettingsStore, initializeTheme } from "@/stores/appStore";

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

const queryClient = new QueryClient();

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


// AppContent removed - using RouterProvider instead

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Suspense fallback={<div className="p-4">Loading…</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
