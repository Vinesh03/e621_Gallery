import { useState } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchBarProps {
  onSearch: (tags: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { searchHistory, addToHistory, clearHistory } = useSearchStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      addToHistory(value.trim());
      onSearch(value.trim());
      setIsFocused(false);
    }
  };

  const handleHistoryClick = (tags: string) => {
    setValue(tags);
    addToHistory(tags);
    onSearch(tags);
    setIsFocused(false);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

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

      {/* Search history dropdown */}
      <AnimatePresence>
        {isFocused && searchHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent searches
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  clearHistory();
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
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
