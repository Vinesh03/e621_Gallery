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
   */
  playFullscreen: async (url: string, title?: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      window.open(url, '_blank');
      return false;
    }

    try {
      await VideoPlayer.stopAllPlayers();

      const initResult = await VideoPlayer.initPlayer({
        mode: 'fullscreen',
        url,
        playerId: FULLSCREEN_PLAYER_ID,
        title: title || 'Video',
        smallTitle: title || 'Video',
        exitOnEnd: true,
        loopOnEnd: false,
        pipEnabled: false,
        bkmodeEnabled: false,
        showControls: true,
        displayMode: 'all',
      });

      if (initResult?.result === false) {
        throw new Error(initResult?.message || 'initPlayer fallito');
      }

      const playResult = await VideoPlayer.play({ playerId: FULLSCREEN_PLAYER_ID });
      if (playResult?.result === false) {
        throw new Error(playResult?.message || 'play fallito');
      }

      return true;
    } catch (error) {
      console.error('Native video player error:', error);
      // Non aprire automaticamente il browser: il chiamante gestisce il fallback in-app
      return false;
    }
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
