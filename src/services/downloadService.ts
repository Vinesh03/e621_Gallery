import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export type DownloadFolder = 'downloads' | 'e621_gallery';

interface DownloadResult {
  success: boolean;
  path?: string;
  error?: string;
}

const VALID_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'webm', 'mp4']);

const getFileExtension = (url: string): string => {
  try {
    const urlPath = url.split('?')[0];
    const extension = urlPath.split('.').pop()?.toLowerCase() || 'jpg';
    return VALID_EXTENSIONS.has(extension) ? extension : 'jpg';
  } catch {
    return 'jpg';
  }
};

const getFileName = (postId: number, url: string): string => {
  if (!postId || postId <= 0) {
    throw new Error('Invalid post ID');
  }
  const extension = getFileExtension(url);
  return `e621_${postId}.${extension}`;
};

export const downloadService = {
  /**
   * Download a file to the device's download folder
   * On native (Android/iOS): uses Filesystem API
   * On web: falls back to browser download
   */
  async downloadFile(
    url: string,
    postId: number,
    folderSetting: DownloadFolder = 'downloads'
  ): Promise<DownloadResult> {
    // Input validation
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'URL non valido' };
    }
    if (!postId || postId <= 0) {
      return { success: false, error: 'ID post non valido' };
    }

    let fileName: string;
    try {
      fileName = getFileName(postId, url);
    } catch (e) {
      return { success: false, error: 'Errore nella generazione del nome file' };
    }
    
    // Check if we're on a native platform
    if (Capacitor.isNativePlatform()) {
      try {
        // Determine the target path based on folder setting
        const targetPath = folderSetting === 'e621_gallery' 
          ? `e621_Gallery/${fileName}` 
          : fileName;

        // Try to create the subfolder if needed
        if (folderSetting === 'e621_gallery') {
          try {
            await Filesystem.mkdir({
              path: 'e621_Gallery',
              directory: Directory.Documents,
              recursive: true,
            });
          } catch (e) {
            // Folder might already exist, ignore error
          }
        }

        // Download the file
        const result = await Filesystem.downloadFile({
          url: url,
          path: targetPath,
          directory: Directory.Documents,
        });

        return {
          success: true,
          path: result.path,
        };
      } catch (error) {
        console.error('Native download failed:', error);
        
        // Fallback to fetch + write for some edge cases
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);
          
          const targetPath = folderSetting === 'e621_gallery' 
            ? `e621_Gallery/${fileName}` 
            : fileName;

          // Create folder if needed
          if (folderSetting === 'e621_gallery') {
            try {
              await Filesystem.mkdir({
                path: 'e621_Gallery',
                directory: Directory.Documents,
                recursive: true,
              });
            } catch (e) {
              // Folder might already exist
            }
          }

          const writeResult = await Filesystem.writeFile({
            path: targetPath,
            data: base64,
            directory: Directory.Documents,
          });

          return {
            success: true,
            path: writeResult.uri,
          };
        } catch (fallbackError) {
          console.error('Fallback download failed:', fallbackError);
          return {
            success: false,
            error: fallbackError instanceof Error ? fallbackError.message : 'Download fallito',
          };
        }
      }
    } else {
      // Web fallback - use fetch and create a blob download
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        return {
          success: true,
          path: fileName,
        };
      } catch (error) {
        console.error('Web download failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Download fallito',
        };
      }
    }
  },
};

// Helper to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
