import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.e621.seeker86',
  appName: 'e621 Gallery',
  webDir: 'dist',
  // DEV: load the app directly from the Lovable preview URL so Android always reflects the latest web changes.
  // For a production/offline build, remove this `server` block.
  server: {
    url: 'https://4488054a-c170-4234-ab8d-7d562f84d7f9.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
};

export default config;
