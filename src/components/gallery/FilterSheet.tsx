import { useSettingsStore, useAuthStore } from '@/stores/appStore';
import { RatingFilter, MediaFilter } from '@/types/e621';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, Moon, Sun, Monitor, LogOut, Image, Film, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ThemeCustomizer } from './ThemeCustomizer';

const ratingOptions: { value: RatingFilter; label: string; description: string }[] = [
  { value: 's', label: 'Solo Safe', description: 'Mostra solo contenuti safe' },
  { value: 'sq', label: 'Safe + Questionable', description: 'Contenuti safe e questionable' },
  { value: 'sqe', label: 'Tutti i rating', description: 'Mostra tutti i contenuti' },
  { value: 'e', label: 'Solo Explicit', description: 'Mostra solo contenuti explicit' },
];

const mediaOptions: { value: MediaFilter; label: string; icon: typeof Image }[] = [
  { value: 'all', label: 'Tutti', icon: Layers },
  { value: 'image', label: 'Solo Immagini', icon: Image },
  { value: 'video', label: 'Solo Video', icon: Film },
];

type ThemeMode = 'dark' | 'light' | 'system';

const themeModeOptions: { value: ThemeMode; label: string; icon: typeof Moon }[] = [
  { value: 'dark', label: 'Scuro', icon: Moon },
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

interface FilterSheetProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FilterSheet({ isOpen, onOpenChange }: FilterSheetProps = {}) {
  const { ratingFilter, setRatingFilter, mediaFilter, setMediaFilter, themeMode, setThemeMode } = useSettingsStore();
  const { logout, credentials, isGuest } = useAuthStore();
  const navigate = useNavigate();

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
          <SheetTitle>Filtri & Impostazioni</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Rating filter */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Rating Contenuti</h3>
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
            <h3 className="font-medium text-sm">Tipo Media</h3>
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
            <h3 className="font-medium text-sm">Colore Tema</h3>
            <ThemeCustomizer />
          </div>

          {/* Theme mode selector */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Modalità Tema</h3>
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

          {/* Logout button */}
          {(credentials || isGuest) && (
            <button
              onClick={handleLogout}
              className="w-full p-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-sm">Logout</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
