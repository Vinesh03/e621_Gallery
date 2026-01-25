import { useState, useEffect, useRef } from 'react';
import { useSettingsStore, useSearchStore, useAuthStore, useInteractionStore, DownloadFolder } from '@/stores/appStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HardDrive, Trash2, Moon, Sun, Monitor, FolderDown, Folder, Zap, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/use-language';
import { ThemeCustomizer } from './ThemeCustomizer';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

type ThemeMode = 'dark' | 'light' | 'system';

function parseStorageInput(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  
  // Match patterns like "500", "500mb", "500 mb", "2gb", "2 gb"
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(mb|gb|m|g)?$/);
  
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'mb';
  
  if (unit === 'gb' || unit === 'g') {
    return Math.round(value * 1024); // Convert GB to MB
  }
  
  return Math.round(value);
}

function formatStorageSize(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

export function AdvancedSettings() {
  const settingsStore = useSettingsStore();
  const { storageLimitMB, setStorageLimitMB, themeMode, setThemeMode, downloadFolder, setDownloadFolder, preloadContent, setPreloadContent } = settingsStore;
  const { clearCache, savedSearches, searchHistory } = useSearchStore();
  const { savedAccounts } = useAuthStore();
  const { favoriteIds } = useInteractionStore();
  const { t } = useLanguage();
  
  const [storageInput, setStorageInput] = useState(formatStorageSize(storageLimitMB));
  const [estimatedUsage, setEstimatedUsage] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export settings to .seeker86 file
  const handleExportSettings = async () => {
    try {
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: {
          ratingFilter: settingsStore.ratingFilter,
          mediaFilter: settingsStore.mediaFilter,
          storageLimitMB: settingsStore.storageLimitMB,
          themeMode: settingsStore.themeMode,
          downloadFolder: settingsStore.downloadFolder,
          preloadContent: settingsStore.preloadContent,
        },
        savedSearches,
        searchHistory,
        favoriteIds: Array.from(favoriteIds),
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const fileName = `seeker86_backup_${new Date().toISOString().split('T')[0]}.seeker86`;

      if (Capacitor.isNativePlatform()) {
        // Native: save to Downloads folder
        await Filesystem.writeFile({
          path: fileName,
          data: jsonContent,
          directory: Directory.Documents,
          encoding: 'utf8' as any,
        });
        toast.success(`Impostazioni esportate in Documenti/${fileName}`);
      } else {
        // Web: trigger download
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Impostazioni esportate!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Errore durante l\'esportazione');
    }
  };

  // Import settings from .seeker86 file
  const handleImportSettings = async (file: File) => {
    try {
      const content = await file.text();
      const importData = JSON.parse(content);

      if (!importData.version || !importData.settings) {
        throw new Error('File non valido');
      }

      // Import settings
      if (importData.settings.ratingFilter) {
        useSettingsStore.getState().setRatingFilter(importData.settings.ratingFilter);
      }
      if (importData.settings.mediaFilter) {
        useSettingsStore.getState().setMediaFilter(importData.settings.mediaFilter);
      }
      if (importData.settings.storageLimitMB) {
        setStorageLimitMB(importData.settings.storageLimitMB);
        setStorageInput(formatStorageSize(importData.settings.storageLimitMB));
      }
      if (importData.settings.themeMode) {
        setThemeMode(importData.settings.themeMode);
      }
      if (importData.settings.downloadFolder) {
        setDownloadFolder(importData.settings.downloadFolder);
      }
      if (typeof importData.settings.preloadContent === 'boolean') {
        setPreloadContent(importData.settings.preloadContent);
      }

      // Import saved searches
      if (importData.savedSearches && Array.isArray(importData.savedSearches)) {
        const searchStore = useSearchStore.getState();
        importData.savedSearches.forEach((search: string) => {
          searchStore.addSavedSearch(search);
        });
      }

      // Import favorites
      if (importData.favoriteIds && Array.isArray(importData.favoriteIds)) {
        const interactionStore = useInteractionStore.getState();
        importData.favoriteIds.forEach((id: number) => {
          interactionStore.addFavorite(id);
        });
      }

      toast.success('Impostazioni importate con successo!');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Errore: file non valido o corrotto');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  const themeModeOptions: { value: ThemeMode; label: string; icon: typeof Moon }[] = [
    { value: 'dark', label: t('theme.dark'), icon: Moon },
    { value: 'light', label: t('theme.light'), icon: Sun },
    { value: 'system', label: t('theme.system'), icon: Monitor },
  ];

  const downloadFolderOptions: { value: DownloadFolder; label: string; description: string; icon: typeof FolderDown }[] = [
    { value: 'downloads', label: 'Download', description: 'Cartella Download standard', icon: FolderDown },
    { value: 'e621_gallery', label: 'e621_Gallery', description: 'Sottocartella dedicata', icon: Folder },
  ];

  // Estimate storage usage
  useEffect(() => {
    const estimateStorage = async () => {
      try {
        // Calculate localStorage usage
        let totalSize = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage.getItem(key)?.length || 0;
          }
        }
        // Convert to MB (rough estimate, 2 bytes per char)
        setEstimatedUsage(Math.round((totalSize * 2) / (1024 * 1024) * 100) / 100);
      } catch (e) {
        setEstimatedUsage(0);
      }
    };
    
    estimateStorage();
  }, []);

  const handleStorageInputChange = (value: string) => {
    setStorageInput(value);
  };

  const handleStorageInputBlur = () => {
    const parsed = parseStorageInput(storageInput);
    if (parsed !== null && parsed >= 50 && parsed <= 10240) { // 50MB to 10GB
      setStorageLimitMB(parsed);
      setStorageInput(formatStorageSize(parsed));
    } else {
      // Reset to current value
      setStorageInput(formatStorageSize(storageLimitMB));
      toast.error('Valore non valido. Inserisci un valore tra 50 MB e 10 GB');
    }
  };

  const handleClearCache = () => {
    clearCache();
    
    // Clear all cached data
    try {
      const keysToKeep = ['e6-auth', 'e6-settings', 'e6-interactions', 'e6-search'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.some(k => key.startsWith(k))) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
    
    toast.success(t('settings.storage.cleared'));
    setEstimatedUsage(0);
  };

  return (
    <div className="space-y-4">
      {/* Theme color */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">{t('theme.color')}</h4>
        <ThemeCustomizer />
      </div>

      {/* Theme mode selector */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">{t('theme.mode')}</h4>
        <div className="grid grid-cols-3 gap-2">
          {themeModeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setThemeMode(option.value)}
                className={cn(
                  "p-3 rounded-lg flex flex-col items-center gap-2 transition-colors",
                  themeMode === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Download folder */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Cartella Download</h4>
        <p className="text-xs text-muted-foreground">
          Scegli dove salvare i contenuti scaricati
        </p>
        <div className="grid grid-cols-2 gap-2">
          {downloadFolderOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => {
                  setDownloadFolder(option.value);
                  toast.success(`Cartella impostata: ${option.label}`);
                }}
                className={cn(
                  "p-3 rounded-lg flex flex-col items-center gap-2 transition-colors text-center",
                  downloadFolder === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{option.label}</span>
                <span className="text-[10px] opacity-70">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preload content toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">Precaricamento Contenuti</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Precarica video e post in background per un'esperienza più fluida
        </p>
        <button
          onClick={() => {
            setPreloadContent(!preloadContent);
            toast.success(preloadContent ? 'Precaricamento disattivato' : 'Precaricamento attivato');
          }}
          className={cn(
            "w-full p-3 rounded-lg flex items-center justify-between transition-colors",
            preloadContent
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          )}
        >
          <span className="text-sm font-medium">
            {preloadContent ? 'Attivo' : 'Disattivato'}
          </span>
          <div
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              preloadContent ? "bg-primary-foreground/30" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform bg-background",
                preloadContent && "transform translate-x-6"
              )}
            />
          </div>
        </button>
      </div>
      
      {/* Storage limit */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HardDrive className="w-4 h-4" />
          <span>{t('settings.storage')}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('settings.storage.desc')}
        </p>
        <div className="flex gap-2">
          <Input
            value={storageInput}
            onChange={(e) => handleStorageInputChange(e.target.value)}
            onBlur={handleStorageInputBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleStorageInputBlur()}
            placeholder="500 MB"
            className="flex-1"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {t('settings.storage.current')}: ~{estimatedUsage} MB / {formatStorageSize(storageLimitMB)}
        </div>
      </div>

      {/* Clear cache button */}
      <Button
        variant="outline"
        onClick={handleClearCache}
        className="w-full flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        {t('settings.storage.clear')}
      </Button>

      {/* Export/Import settings */}
      <div className="space-y-2 pt-4 border-t border-border">
        <h4 className="font-medium text-sm">Backup Impostazioni</h4>
        <p className="text-xs text-muted-foreground">
          Esporta o importa tutte le impostazioni, ricerche salvate e preferiti
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleExportSettings}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Esporta
          </Button>
          <Button
            variant="outline"
            onClick={triggerFileInput}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importa
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".seeker86"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleImportSettings(file);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}