import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface ShareResult {
  success: boolean;
  error?: string;
}

export const shareService = {
  /**
   * Share a post link
   * On native: uses native share sheet
   * On web: uses Web Share API or falls back to clipboard
   */
  async sharePost(postId: number): Promise<ShareResult> {
    const url = `https://e621.net/posts/${postId}`;
    const title = `Post #${postId} - e621`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: title,
          text: `Guarda questo post su e621!`,
          url: url,
          dialogTitle: 'Condividi post',
        });
        return { success: true };
      } catch (error) {
        console.error('Native share failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Condivisione fallita',
        };
      }
    } else {
      // Web fallback
      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: `Guarda questo post su e621!`,
            url: url,
          });
          return { success: true };
        } catch (error) {
          // User cancelled or error
          if ((error as Error).name === 'AbortError') {
            return { success: true }; // User cancelled, not an error
          }
          console.error('Web share failed:', error);
        }
      }
      
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(url);
        return { success: true };
      } catch (error) {
        console.error('Clipboard fallback failed:', error);
        return {
          success: false,
          error: 'Impossibile copiare il link',
        };
      }
    }
  },
};
