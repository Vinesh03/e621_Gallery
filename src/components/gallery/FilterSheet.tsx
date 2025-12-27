import { useSettingsStore, useAuthStore } from '@/stores/appStore';
import { RatingFilter, MediaFilter } from '@/types/e621';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, Moon, Sun, Monitor, LogOut, Image, Film, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ThemeCustomizer } from './ThemeCustomizer';
import { AdvancedSettings } from './AdvancedSettings';
import { useLanguage } from '@/hooks/use-language';
import { useState } from 'react';

type ThemeMode = 'dark' | 'light' | 'system';

interface FilterSheetProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FilterSheet({ isOpen, onOpenChange }: FilterSheetProps = {}) {
  const { ratingFilter, setRatingFilter, mediaFilter, setMediaFilter, themeMode, setThemeMode } = useSettingsStore();
  const { logout, credentials, isGuest } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const ratingOptions: { value: RatingFilter; label: string; description: string }[] = [
    { value: 's', label: t('filter.rating.safe'), description: t('filter.rating.safe.desc') },
    { value: 'sq', label: t('filter.rating.sq'), description: t('filter.rating.sq.desc') },
    { value: 'sqe', label: t('filter.rating.all'), description: t('filter.rating.all.desc') },
    { value: 'e', label: t('filter.rating.explicit'), description: t('filter.rating.explicit.desc') },
  ];

  const mediaOptions: { value: MediaFilter; label: string; icon: typeof Image }[] = [
    { value: 'all', label: t('filter.media.all'), icon: Layers },
    { value: 'image', label: t('filter.media.image'), icon: Image },
    { value: 'video', label: t('filter.media.video'), icon: Film },
  ];

  const themeModeOptions: { value: ThemeMode; label: string; icon: typeof Moon }[] = [
    { value: 'dark', label: t('theme.dark'), icon: Moon },
    { value: 'light', label: t('theme.light'), icon: Sun },
    { value: 'system', label: t('theme.system'), icon: Monitor },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {!isOpen && onOpenChange === undefined && (
        <SheetTrigger asChild>
          <button className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </SheetTrigger>
      )}
      <SheetContent className="bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('filter.title')}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Rating filter */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">{t('filter.rating')}</h3>
            <div className="space-y-2">
              {ratingOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRatingFilter(option.value)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors",
                    ratingFilter === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className={cn(
                    "text-xs mt-0.5",
                    ratingFilter === option.value
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}>
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Media type filter */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">{t('filter.media')}</h3>
            <div className="grid grid-cols-3 gap-2">
              {mediaOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setMediaFilter(option.value)}
                    className={cn(
                      "p-3 rounded-lg flex flex-col items-center gap-2 transition-colors",
                      mediaFilter === option.value
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

          {/* Theme customizer */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">{t('theme.color')}</h3>
            <ThemeCustomizer />
          </div>

          {/* Theme mode selector */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">{t('theme.mode')}</h3>
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

          {/* Advanced settings toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-between"
          >
            <span className="font-medium text-sm">{t('settings.advanced')}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showAdvanced && <AdvancedSettings />}

          {/* Logout button */}
          {(credentials || isGuest) && (
            <button
              onClick={handleLogout}
              className="w-full p-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-sm">{isGuest ? t('action.login') : t('action.logout')}</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
