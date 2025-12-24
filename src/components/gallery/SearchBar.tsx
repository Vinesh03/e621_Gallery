import { useState, useEffect, useCallback } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchStore } from '@/stores/appStore';
import { e621Api } from '@/services/e621Api';
import { E621Tag } from '@/types/e621';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchBarProps {
  onSearch: (tags: string) => void;
}

const tagCategoryColors: Record<number, string> = {
  0: 'text-foreground',      // general
  1: 'text-primary',         // artist
  3: 'text-destructive',     // copyright
  4: 'text-accent',          // character
  5: 'text-success',         // species
};

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<E621Tag[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { searchHistory, addToHistory, clearHistory } = useSearchStore();

  // Debounced tag search
  const searchTags = useCallback(async (query: string) => {
    // Get the last word being typed (for autocomplete)
    const words = query.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const tags = await e621Api.searchTags(lastWord, 8);
      setSuggestions(tags);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (isFocused && value) {
        searchTags(value);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [value, isFocused, searchTags]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      addToHistory(value.trim());
      onSearch(value.trim());
      setIsFocused(false);
      setSuggestions([]);
    }
  };

  const handleHistoryClick = (tags: string) => {
    setValue(tags);
    addToHistory(tags);
    onSearch(tags);
    setIsFocused(false);
    setSuggestions([]);
  };

  const handleSuggestionClick = (tag: E621Tag) => {
    // Replace the last word with the selected tag
    const words = value.split(' ');
    words[words.length - 1] = tag.name;
    const newValue = words.join(' ') + ' ';
    setValue(newValue);
    setSuggestions([]);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
    setSuggestions([]);
  };

  const showSuggestions = isFocused && suggestions.length > 0;
  const showHistory = isFocused && !showSuggestions && searchHistory.length > 0 && !value;

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search tags..."
          className="pl-10 pr-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Tag suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">
                {isLoadingSuggestions ? 'Caricamento...' : 'Suggerimenti tag'}
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleSuggestionClick(tag)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center justify-between",
                  )}
                >
                  <span className={tagCategoryColors[tag.category] || 'text-foreground'}>
                    {tag.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tag.post_count.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search history dropdown */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Ricerche recenti
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  clearHistory();
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancella
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {searchHistory.map((tags, i) => (
                <button
                  key={i}
                  onClick={() => handleHistoryClick(tags)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors",
                    "truncate"
                  )}
                >
                  {tags}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}