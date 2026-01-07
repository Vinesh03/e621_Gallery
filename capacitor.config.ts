import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.e621.seeker86',
  appName: 'e621 Gallery',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
};

export default config;
