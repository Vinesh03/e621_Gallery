import { useSettingsStore } from '@/stores/appStore';
import { RatingFilter } from '@/types/e621';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

const ratingOptions: { value: RatingFilter; label: string; description: string }[] = [
  { value: 's', label: 'Safe only', description: 'Only show safe content' },
  { value: 'sq', label: 'Safe + Questionable', description: 'Safe and questionable content' },
  { value: 'sqe', label: 'All ratings', description: 'Show all content' },
];

export function FilterSheet() {
  const { ratingFilter, setRatingFilter, darkMode, setDarkMode } = useSettingsStore();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent className="bg-background border-border">
        <SheetHeader>
          <SheetTitle>Filters & Settings</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Rating filter */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Content Rating</h3>
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

          {/* Dark mode toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
              <span className="font-medium text-sm">Dark Mode</span>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={toggleDarkMode}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
