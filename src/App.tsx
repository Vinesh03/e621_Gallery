import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore, useSettingsStore, initializeTheme } from "@/stores/appStore";
import LoginPage from "@/pages/LoginPage";
import GalleryPage from "@/pages/GalleryPage";
import FavoritesPage from "@/pages/FavoritesPage";
import NotFound from "@/pages/NotFound";

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

function AppContent() {
  const { themeMode } = useSettingsStore();

  // Re-initialize theme when themeMode changes
  useEffect(() => {
    initializeTheme();
  }, [themeMode]);


  return (
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
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
