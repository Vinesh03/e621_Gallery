import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.e621.seeker86",
  appName: "E6 Gallery",
  webDir: "dist",
  server: {
    url: "https://4488054a-c170-4234-ab8d-7d562f84d7f9.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
};

export default config;
