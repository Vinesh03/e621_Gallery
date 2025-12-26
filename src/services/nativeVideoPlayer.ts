import { Capacitor } from '@capacitor/core';
import { CapacitorVideoPlayer } from 'capacitor-video-player';

const FULLSCREEN_PLAYER_ID = 'fullscreen';

export const nativeVideoPlayer = {
  isNative: () => Capacitor.isNativePlatform(),

  /**
   * Play a video in fullscreen native player
   */
  playFullscreen: async (url: string, title?: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback: open in new tab on web
      window.open(url, '_blank');
      return false;
    }

    try {
      const initResult = await CapacitorVideoPlayer.initPlayer({
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

      const playResult = await CapacitorVideoPlayer.play({ playerId: FULLSCREEN_PLAYER_ID });
      if (playResult?.result === false) {
        throw new Error(playResult?.message || 'play fallito');
      }

      return true;
    } catch (error) {
      console.error('Native video player error:', error);
      // Fallback: open in browser
      window.open(url, '_blank');
      return false;
    }
  },

  /**
   * Stop the native player
   */
  stop: async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await CapacitorVideoPlayer.stopAllPlayers();
    } catch (error) {
      console.error('Error stopping native player:', error);
    }
  },
};
