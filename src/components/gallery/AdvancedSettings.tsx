import { useState, useEffect } from 'react';
import { useSettingsStore, useSearchStore, DownloadFolder } from '@/stores/appStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HardDrive, Trash2, Moon, Sun, Monitor, FolderDown, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/use-language';
import { ThemeCustomizer } from './ThemeCustomizer';
import { cn } from '@/lib/utils';

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
  const { storageLimitMB, setStorageLimitMB, themeMode, setThemeMode, downloadFolder, setDownloadFolder } = useSettingsStore();
  const { clearCache } = useSearchStore();
  const { t } = useLanguage();
  
  const [storageInput, setStorageInput] = useState(formatStorageSize(storageLimitMB));
  const [estimatedUsage, setEstimatedUsage] = useState<number>(0);

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
    </div>
  );
}