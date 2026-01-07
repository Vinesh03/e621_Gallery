import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RatingFilter, MediaFilter, E621Post } from '@/types/e621';

// Auth Store
interface Credentials {
  username: string;
  apiKey: string;
}

interface AuthState {
  credentials: Credentials | null;
  isGuest: boolean;
  isFirstLogin: boolean;
  setCredentials: (credentials: Credentials) => void;
  setGuest: (isGuest: boolean) => void;
  logout: () => void;
  setNotFirstLogin: () => void;
}

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    credentials: null,
    isGuest: false,
    isFirstLogin: true,
    setCredentials: (credentials) => set({ credentials, isGuest: false, isFirstLogin: true }),
    setGuest: (isGuest) => set({ isGuest, credentials: null }),
    logout: () => set({ credentials: null, isGuest: false }),
    setNotFirstLogin: () => set({ isFirstLogin: false }),
  }),
  { name: 'e6-auth', version: 1 }
));

// Settings Store
type ThemeMode = 'dark' | 'light' | 'system';
type ViewMode = 'gallery' | 'shorts';
export type DownloadFolder = 'downloads' | 'e621_gallery';

interface SettingsState {
  ratingFilter: RatingFilter;
  mediaFilter: MediaFilter;
  viewMode: ViewMode;
  storageLimitMB: number;
  themeColor: string;
  themeMode: ThemeMode;
  hasShownInitialSplash: boolean;
  downloadFolder: DownloadFolder;
  preloadContent: boolean;
  setRatingFilter: (filter: RatingFilter) => void;
  setMediaFilter: (filter: MediaFilter) => void;
  setViewMode: (mode: ViewMode) => void;
  setStorageLimitMB: (limit: number) => void;
  setThemeColor: (color: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHasShownInitialSplash: (shown: boolean) => void;
  setDownloadFolder: (folder: DownloadFolder) => void;
  setPreloadContent: (enabled: boolean) => void;
  resetViewMode: () => void;
}

export const useSettingsStore = create<SettingsState>()(persist(
  (set) => ({
    ratingFilter: 's' as RatingFilter,
    mediaFilter: 'all' as MediaFilter,
    viewMode: 'gallery' as ViewMode,
    storageLimitMB: 500,
    themeColor: 'hsl(221.2, 83.2%, 53.3%)',
    themeMode: 'dark' as ThemeMode,
    hasShownInitialSplash: false,
    downloadFolder: 'downloads' as DownloadFolder,
    preloadContent: true,
    setRatingFilter: (filter) => set({ ratingFilter: filter }),
    setMediaFilter: (filter) => set({ mediaFilter: filter }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setStorageLimitMB: (limit) => set({ storageLimitMB: limit }),
    setThemeColor: (color) => set({ themeColor: color }),
    setThemeMode: (mode) => set({ themeMode: mode }),
    setHasShownInitialSplash: (shown) => set({ hasShownInitialSplash: shown }),
    setDownloadFolder: (folder) => set({ downloadFolder: folder }),
    setPreloadContent: (enabled) => set({ preloadContent: enabled }),
    resetViewMode: () => set({ viewMode: 'gallery' }),
  }),
  { 
    name: 'e6-settings',
    version: 9,
    migrate: (persistedState: any, version: number) => {
      if (version < 9) {
        // Always reset to gallery on migration
        return {
          ...persistedState,
          viewMode: 'gallery',
          preloadContent: persistedState.preloadContent ?? true,
        };
      }
      return persistedState as SettingsState;
    },
  }
));

// Interaction Store (favorites, etc)
interface InteractionState {
  favoriteIds: Set<number>;
  addFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

export const useInteractionStore = create<InteractionState>()(persist(
  (set, get) => ({
    favoriteIds: new Set(),
    addFavorite: (id) => set((state) => ({ favoriteIds: new Set([...state.favoriteIds, id]) })),
    removeFavorite: (id) => set((state) => {
      const newSet = new Set(state.favoriteIds);
      newSet.delete(id);
      return { favoriteIds: newSet };
    }),
    isFavorite: (id) => get().favoriteIds.has(id),
  }),
  {
    name: 'e6-interactions',
    version: 1,
    storage: {
      getItem: (name) => {
        const str = localStorage.getItem(name);
        if (!str) return null;
        const data = JSON.parse(str);
        return {
          state: {
            ...data.state,
            favoriteIds: new Set(data.state.favoriteIds || []),
          },
        };
      },
      setItem: (name, value) => {
        const data = {
          state: {
            ...value.state,
            favoriteIds: Array.from(value.state.favoriteIds),
          },
        };
        localStorage.setItem(name, JSON.stringify(data));
      },
      removeItem: (name) => localStorage.removeItem(name),
    },
  }
));

// Search Store with caching
interface CacheEntry {
  posts: E621Post[];
  timestamp: number;
  rating: RatingFilter;
  mediaFilter: MediaFilter;
}

export interface SavedSearch {
  id: string;
  name: string;
  tags: string;
  createdAt: number;
}

interface SearchState {
  currentTags: string;
  cache: Map<string, CacheEntry>;
  savedSearches: SavedSearch[];
  setCurrentTags: (tags: string) => void;
  getCachedPosts: (tags: string, rating: RatingFilter, mediaFilter: MediaFilter) => E621Post[] | null;
  setCachedPosts: (posts: E621Post[], tags: string, rating: RatingFilter, mediaFilter: MediaFilter) => void;
  clearCache: () => void;
  addSavedSearch: (tags: string, name?: string) => void;
  removeSavedSearch: (id: string) => void;
  renameSavedSearch: (id: string, newName: string) => void;
  updateSavedSearchTags: (id: string, newTags: string) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 20;

export const useSearchStore = create<SearchState>()(persist(
  (set, get) => ({
    currentTags: '',
    cache: new Map(),
    savedSearches: [],
    setCurrentTags: (tags) => set({ currentTags: tags }),
    getCachedPosts: (tags, rating, mediaFilter) => {
      const cacheKey = `${tags}_${rating}_${mediaFilter}`;
      const entry = get().cache.get(cacheKey);
      if (!entry) return null;
      
      const now = Date.now();
      if (now - entry.timestamp > CACHE_DURATION) {
        const newCache = new Map(get().cache);
        newCache.delete(cacheKey);
        set({ cache: newCache });
        return null;
      }
      
      return entry.posts;
    },
    setCachedPosts: (posts, tags, rating, mediaFilter) => {
      const cacheKey = `${tags}_${rating}_${mediaFilter}`;
      const newCache = new Map(get().cache);
      
      // Limit cache size
      if (newCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = newCache.keys().next().value;
        newCache.delete(firstKey);
      }
      
      newCache.set(cacheKey, {
        posts,
        timestamp: Date.now(),
        rating,
        mediaFilter,
      });
      
      set({ cache: newCache });
    },
    clearCache: () => set({ cache: new Map() }),
    addSavedSearch: (tags, name) => {
      const newSearch: SavedSearch = {
        id: Date.now().toString(),
        name: name || '',
        tags,
        createdAt: Date.now(),
      };
      set((state) => ({
        savedSearches: [newSearch, ...state.savedSearches],
      }));
    },
    removeSavedSearch: (id) => {
      set((state) => ({
        savedSearches: state.savedSearches.filter((s) => s.id !== id),
      }));
    },
    renameSavedSearch: (id, newName) => {
      set((state) => ({
        savedSearches: state.savedSearches.map((s) =>
          s.id === id ? { ...s, name: newName } : s
        ),
      }));
    },
    updateSavedSearchTags: (id, newTags) => {
      set((state) => ({
        savedSearches: state.savedSearches.map((s) =>
          s.id === id ? { ...s, tags: newTags } : s
        ),
      }));
    },
  }),
  {
    name: 'e6-search',
    version: 2,
    storage: {
      getItem: (name) => {
        const str = localStorage.getItem(name);
        if (!str) return null;
        const data = JSON.parse(str);
        return {
          state: {
            ...data.state,
            cache: new Map(data.state.cache || []),
          },
        };
      },
      setItem: (name, value) => {
        const data = {
          state: {
            ...value.state,
            cache: Array.from(value.state.cache.entries()),
          },
        };
        localStorage.setItem(name, JSON.stringify(data));
      },
      removeItem: (name) => localStorage.removeItem(name),
    },
  }
));