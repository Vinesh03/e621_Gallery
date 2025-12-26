import { Capacitor } from '@capacitor/core';
import { CapacitorVideoPlayer } from 'capacitor-video-player';

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
      await CapacitorVideoPlayer.initPlayer({
        mode: 'fullscreen',
        url,
        playerId: 'native-player',
        componentTag: 'app-fullscreen',
        title: title || 'Video',
        smallTitle: title || 'Video',
        exitOnEnd: true,
        loopOnEnd: false,
        pipEnabled: false,
        bkmodeEnabled: false,
        showControls: true,
        displayMode: 'landscape',
      });

      await CapacitorVideoPlayer.play({ playerId: 'native-player' });
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
