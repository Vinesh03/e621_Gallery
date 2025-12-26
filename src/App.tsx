import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuthStore, useSettingsStore } from "@/stores/appStore";
import LoginPage from "@/pages/LoginPage";
import GalleryPage from "@/pages/GalleryPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { credentials, isGuest } = useAuthStore();
  if (!credentials && !isGuest) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  const { darkMode } = useSettingsStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Native (in-app): avoid content under the OS status bar
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        // @vite-ignore prevents Vite from analyzing this import during build
        const { StatusBar, Style } = await import(/* @vite-ignore */ '@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false });
        // Dark mode needs LIGHT icons; light mode needs DARK icons
        await StatusBar.setStyle({ style: darkMode ? Style.Light : Style.Dark });
      } catch {
        // no-op – plugin not available on web
      }
    })();
  }, [darkMode]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/gallery" element={
        <ProtectedRoute>
          <GalleryPage />
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
