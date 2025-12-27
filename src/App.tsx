import React, { useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { useAuthStore, useSettingsStore, initializeTheme } from "@/stores/appStore";

const LoginPage = React.lazy(() => import("@/pages/LoginPage"));
const GalleryPage = React.lazy(() => import("@/pages/GalleryPage"));
const FavoritesPage = React.lazy(() => import("@/pages/FavoritesPage"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/gallery", element: <GalleryPageWithProtect /> },
  { path: "/favorites", element: <FavoritesPageWithProtect /> },
  { path: "/", element: <Navigate to="/gallery" replace /> },
  { path: "*", element: <NotFound /> },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }
});

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

function AppContent() {
  const { themeMode } = useSettingsStore();

  // Re-initialize theme when themeMode changes
  useEffect(() => {
    initializeTheme();
  }, [themeMode]);


  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/gallery" element={
          <ProtectedRoute>
            <GalleryPage />
          </ProtectedRoute>
        } />
        <Route path="/favorites" element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/gallery" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

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
