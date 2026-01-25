import { Capacitor, registerPlugin } from '@capacitor/core';

const FULLSCREEN_PLAYER_ID = 'fullscreen';

type PluginResult = { result?: boolean; message?: string };

type CapacitorVideoPlayerPlugin = {
  initPlayer(options: {
    mode: 'fullscreen';
    url: string;
    playerId: string;
    title?: string;
    smallTitle?: string;
    exitOnEnd?: boolean;
    loopOnEnd?: boolean;
    pipEnabled?: boolean;
    bkmodeEnabled?: boolean;
    showControls?: boolean;
    displayMode?: 'all' | 'portrait' | 'landscape';
  }): Promise<PluginResult>;

  play(options: { playerId: string }): Promise<PluginResult>;

  stopAllPlayers(): Promise<void>;
};

// Avoid build-time dependency on the npm wrappers by registering plugins by name.
// Native side must still be present on device (via `npx cap sync`).
const VideoPlayer = registerPlugin<CapacitorVideoPlayerPlugin>('CapacitorVideoPlayer');

export const nativeVideoPlayer = {
  isNative: () => Capacitor.isNativePlatform(),

  /**
   * Play a video in fullscreen native player
   * Returns false to always use the in-app HTML5 player (more reliable on Android)
   */
  playFullscreen: async (_url: string, _title?: string): Promise<boolean> => {
    // Always return false to use the in-app HTML5 video player
    // This avoids crashes caused by missing/incompatible native video player plugin
    return false;
  },

  stop: async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await VideoPlayer.stopAllPlayers();
    } catch (error) {
      console.error('Error stopping native player:', error);
    }
  },
};
