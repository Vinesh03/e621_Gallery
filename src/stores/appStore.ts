import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RatingFilter, MediaFilter, E621Post } from '@/types/e621';
import { e621Api } from '@/services/e621Api';

// Auth Store
interface Credentials {
  username: string;
  apiKey: string;
}

interface SavedAccount {
  username: string;
  apiKey: string;
}

interface AuthState {
  credentials: Credentials | null;
  isGuest: boolean;
  isFirstLogin: boolean;
  savedAccounts: SavedAccount[];
  isLoading: boolean;
  error: string | null;
  setCredentials: (credentials: Credentials) => void;
  setGuest: (isGuest: boolean) => void;
  logout: () => void;
  setNotFirstLogin: () => void;
  login: (username: string, apiKey: string) => Promise<boolean>;
  loginAsGuest: () => void;
  loginWithSavedAccount: (username: string) => Promise<boolean>;
  removeSavedAccount: (username: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(persist(
  (set, get) => ({
    credentials: null,
    isGuest: false,
    isFirstLogin: true,
    savedAccounts: [],
    isLoading: false,
    error: null,
    setCredentials: (credentials) => set({ credentials, isGuest: false, isFirstLogin: true }),
    setGuest: (isGuest) => set({ isGuest, credentials: null }),
    logout: () => set({ credentials: null, isGuest: false }),
    setNotFirstLogin: () => set({ isFirstLogin: false }),
    clearError: () => set({ error: null }),
    login: async (username, apiKey) => {
      set({ isLoading: true, error: null });
      try {
        e621Api.setCredentials({ username, apiKey });
        const isValid = await e621Api.validateCredentials();
        if (isValid) {
          const savedAccounts = get().savedAccounts;
          const exists = savedAccounts.some(a => a.username === username);
          set({
            credentials: { username, apiKey },
            isGuest: false,
            isFirstLogin: true,
            savedAccounts: exists ? savedAccounts : [...savedAccounts, { username, apiKey }],
            isLoading: false,
          });
          return true;
        } else {
          set({ error: 'Credenziali non valide', isLoading: false });
          return false;
        }
      } catch {
        set({ error: 'Errore di connessione', isLoading: false });
        return false;
      }
    },
    loginAsGuest: () => {
      e621Api.setCredentials(null);
      set({ isGuest: true, credentials: null });
    },
    loginWithSavedAccount: async (username) => {
      const account = get().savedAccounts.find(a => a.username === username);
      if (!account) return false;
      return get().login(account.username, account.apiKey);
    },
    removeSavedAccount: (username) => {
      set((state) => ({
        savedAccounts: state.savedAccounts.filter(a => a.username !== username),
      }));
    },
  }),
  { name: 'e6-auth', version: 2 }
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
  themeHue: number;
  themeSaturation: number;
  themeMode: ThemeMode;
  hasShownInitialSplash: boolean;
  downloadFolder: DownloadFolder;
  preloadContent: boolean;
  setRatingFilter: (filter: RatingFilter) => void;
  setMediaFilter: (filter: MediaFilter) => void;
  setViewMode: (mode: ViewMode) => void;
  setStorageLimitMB: (limit: number) => void;
  setThemeColor: (hue: number, saturation: number) => void;
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
    themeHue: 215,
    themeSaturation: 85,
    themeMode: 'dark' as ThemeMode,
    hasShownInitialSplash: false,
    downloadFolder: 'downloads' as DownloadFolder,
    preloadContent: true,
    setRatingFilter: (filter) => set({ ratingFilter: filter }),
    setMediaFilter: (filter) => set({ mediaFilter: filter }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setStorageLimitMB: (limit) => set({ storageLimitMB: limit }),
    setThemeColor: (hue, saturation) => set({ themeHue: hue, themeSaturation: saturation }),
    setThemeMode: (mode) => set({ themeMode: mode }),
    setHasShownInitialSplash: (shown) => set({ hasShownInitialSplash: shown }),
    setDownloadFolder: (folder) => set({ downloadFolder: folder }),
    setPreloadContent: (enabled) => set({ preloadContent: enabled }),
    resetViewMode: () => set({ viewMode: 'gallery' }),
  }),
  { 
    name: 'e6-settings',
    version: 10,
    migrate: (persistedState: any, version: number) => {
      if (version < 10) {
        return {
          ...persistedState,
          viewMode: 'gallery',
          preloadContent: persistedState.preloadContent ?? true,
          themeHue: 215,
          themeSaturation: 85,
        };
      }
      return persistedState as SettingsState;
    },
  }
));

// Initialize theme on app load
export function initializeTheme() {
  const stored = localStorage.getItem('e6-settings');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      const mode = data?.state?.themeMode || 'dark';
      const hue = data?.state?.themeHue || 215;
      const saturation = data?.state?.themeSaturation || 85;
      
      document.documentElement.classList.toggle('dark', mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
      document.documentElement.style.setProperty('--primary', `${hue} ${saturation}% 55%`);
      document.documentElement.style.setProperty('--ring', `${hue} ${saturation}% 55%`);
      document.documentElement.style.setProperty('--accent', `${(hue + 20) % 360} ${saturation}% 55%`);
    } catch {}
  }
}

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

// User Interactions Store (votes, favorites per post)
interface UserInteractionsState {
  votes: Record<number, 1 | -1 | 0>;
  favorites: Record<number, boolean>;
  getUserVote: (postId: number) => 1 | -1 | 0;
  setUserVote: (postId: number, vote: 1 | -1 | 0) => void;
  isUserFavorite: (postId: number) => boolean;
  setUserFavorite: (postId: number, isFav: boolean) => void;
}

export const useUserInteractionsStore = create<UserInteractionsState>()(persist(
  (set, get) => ({
    votes: {},
    favorites: {},
    getUserVote: (postId) => get().votes[postId] || 0,
    setUserVote: (postId, vote) => set((state) => ({ votes: { ...state.votes, [postId]: vote } })),
    isUserFavorite: (postId) => get().favorites[postId] || false,
    setUserFavorite: (postId, isFav) => set((state) => ({ favorites: { ...state.favorites, [postId]: isFav } })),
  }),
  { name: 'e6-user-interactions', version: 1 }
));

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
  searchHistory: string[];
  setCurrentTags: (tags: string) => void;
  getCachedPosts: (tags: string, rating: RatingFilter, mediaFilter: MediaFilter) => E621Post[] | null;
  setCachedPosts: (posts: E621Post[], tags: string, rating: RatingFilter, mediaFilter: MediaFilter) => void;
  clearCache: () => void;
  addSavedSearch: (tags: string, name?: string) => void;
  removeSavedSearch: (id: string) => void;
  renameSavedSearch: (id: string, newName: string) => void;
  updateSavedSearchTags: (id: string, newTags: string) => void;
  addToHistory: (tags: string) => void;
  clearHistory: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 20;

const MAX_HISTORY = 10;

export const useSearchStore = create<SearchState>()(persist(
  (set, get) => ({
    currentTags: '',
    cache: new Map(),
    savedSearches: [],
    searchHistory: [],
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
    addToHistory: (tags) => {
      set((state) => {
        const filtered = state.searchHistory.filter(t => t !== tags);
        return { searchHistory: [tags, ...filtered].slice(0, MAX_HISTORY) };
      });
    },
    clearHistory: () => set({ searchHistory: [] }),
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