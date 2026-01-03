import { useSettingsStore, useAuthStore, useSearchStore, SavedSearch } from '@/stores/appStore';
import { RatingFilter, MediaFilter } from '@/types/e621';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, LogOut, Image, Film, Layers, ChevronDown, ChevronUp, Bookmark, Plus, X, Edit2, Check, RefreshCw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FilterSheetProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FilterSheet({ isOpen, onOpenChange }: FilterSheetProps = {}) {
  const { ratingFilter, setRatingFilter, mediaFilter, setMediaFilter } = useSettingsStore();
  const { logout, credentials, isGuest } = useAuthStore();
  const { currentTags, setCurrentTags, savedSearches, addSavedSearch, removeSavedSearch, renameSavedSearch, updateSavedSearchTags } = useSearchStore();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Support both controlled and uncontrolled usage.
  // When uncontrolled, we still need a way to close the sheet before navigating.
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;
  const handleOpenChange = onOpenChange ?? setInternalOpen;

  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const handleLogout = () => {
    handleOpenChange(false);
    logout();
    navigate('/');
  };

  const handleSaveCurrentSearch = () => {
    if (!currentTags.trim()) {
      toast.error(t('saved.empty'));
      return;
    }
    addSavedSearch(currentTags);
    toast.success(t('saved.added'));
  };

  const handleLoadSearch = (search: SavedSearch) => {
    // Import saved search tags to search bar
    setCurrentTags(search.tags);
    handleOpenChange(false);
  };

  const handleOverwriteSearch = (id: string) => {
    if (!currentTags.trim()) {
      toast.error(t('saved.empty'));
      return;
    }
    updateSavedSearchTags(id, currentTags);
    toast.success(t('saved.overwritten'));
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      renameSavedSearch(id, editName.trim());
      toast.success(t('saved.renamed'));
    }
    setEditingId(null);
    setEditName('');
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {isOpen === undefined && onOpenChange === undefined && (
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

          {/* Saved searches section */}
          <div className="space-y-3">
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="w-full p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                <span className="font-medium text-sm">{t('saved.title')}</span>
              </div>
              {showSavedSearches ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showSavedSearches && (
              <div className="space-y-2">
                {/* Save current search button */}
                {currentTags.trim() && (
                  <Button
                    variant="outline"
                    onClick={handleSaveCurrentSearch}
                    className="w-full flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('saved.save')}
                  </Button>
                )}
                
                {/* List of saved searches */}
                {savedSearches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    {t('saved.empty.list')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {savedSearches.map((search) => (
                      <div
                        key={search.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
                      >
                        {editingId === search.id ? (
                          <>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 h-8 text-sm"
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(search.id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(search.id)}
                              className="p-1 hover:bg-primary/20 rounded"
                            >
                              <Check className="w-4 h-4 text-primary" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleLoadSearch(search)}
                              className="flex-1 text-left"
                            >
                              <div className="font-medium text-sm truncate">
                                {search.name || search.tags}
                              </div>
                              {search.name && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {search.tags}
                                </div>
                              )}
                            </button>
                            {/* Overwrite button - only show if current tags exist and differ */}
                            {currentTags.trim() && currentTags !== search.tags && (
                              <button
                                onClick={() => handleOverwriteSearch(search.id)}
                                className="p-1 hover:bg-accent/20 rounded"
                                title={t('saved.overwrite')}
                              >
                                <RefreshCw className="w-3 h-3 text-accent" />
                              </button>
                            )}
                            <button
                              onClick={() => handleStartEdit(search.id, search.name || search.tags)}
                              className="p-1 hover:bg-primary/20 rounded"
                            >
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => {
                                removeSavedSearch(search.id);
                                toast.success(t('saved.removed'));
                              }}
                              className="p-1 hover:bg-destructive/20 rounded"
                            >
                              <X className="w-3 h-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced settings link */}
          <button
            onClick={() => {
              handleOpenChange(false);
              navigate('/settings');
            }}
            className="w-full p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="font-medium text-sm">{t('settings.advanced')}</span>
            </div>
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>

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