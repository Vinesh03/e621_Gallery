import { CapacitorVideoPlayer } from 'capacitor-video-player';
import { Capacitor } from '@capacitor/core';

class VideoPlayerService {
  private player = CapacitorVideoPlayer;

  /**
   * Play video using native player (Android/iOS)
   * This avoids WebView crashes with WebM format
   */
  async playVideo(videoUrl: string, title?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[VideoPlayer] Starting native playback');
      console.log('[VideoPlayer] URL:', videoUrl);
      console.log('[VideoPlayer] Platform:', Capacitor.getPlatform());

      // Check if we're on a native platform
      if (Capacitor.getPlatform() === 'web') {
        console.warn('[VideoPlayer] Running on web, native player not available');
        return {
          success: false,
          error: 'Native player only available on mobile'
        };
      }

      // Play video in fullscreen using native player
      await this.player.initPlayer({
        mode: 'fullscreen',
        url: videoUrl,
        playerId: 'e621-player',
        componentTag: 'app-video-player',
        width: window.innerWidth,
        height: window.innerHeight,
      });

      console.log('[VideoPlayer] ✅ Video playback started successfully');
      
      return { success: true };
    } catch (error) {
      console.error('[VideoPlayer] ❌ Error playing video:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stop any currently playing video
   */
  async stopVideo(): Promise<void> {
    try {
      // The fullscreen player usually closes automatically
      // but we can call stopAllPlayers to be sure
      await this.player.stopAllPlayers();
      console.log('[VideoPlayer] Stopped all players');
    } catch (error) {
      console.error('[VideoPlayer] Error stopping video:', error);
    }
  }
}

export const videoPlayerService = new VideoPlayerService();