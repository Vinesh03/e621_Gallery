import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthCredentials, RatingFilter, MediaFilter } from '@/types/e621';
import { e621Api } from '@/services/e621Api';

interface SavedAccount {
  username: string;
  apiKey: string;
}

interface AuthState {
  credentials: AuthCredentials | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  isFirstLogin: boolean;
  savedAccounts: SavedAccount[];
  
  login: (username: string, apiKey: string) => Promise<boolean>;
  loginAsGuest: () => void;
  logout: () => void;
  clearError: () => void;
  setNotFirstLogin: () => void;
  loginWithSavedAccount: (username: string) => Promise<boolean>;
  removeSavedAccount: (username: string) => void;
}

type ThemeMode = 'dark' | 'light' | 'system';

interface SettingsState {
  ratingFilter: RatingFilter;
  mediaFilter: MediaFilter;
  darkMode: boolean;
  themeMode: ThemeMode;
  gridColumns: 2 | 3 | 4;
  viewMode: 'gallery' | 'shorts';
  themeHue: number;
  themeSaturation: number;
  savedMediaFilter: MediaFilter; // Saved filter before switching to shorts
  hasShownInitialSplash: boolean; // Track if splash has been shown this session
  
  setRatingFilter: (filter: RatingFilter) => void;
  setMediaFilter: (filter: MediaFilter) => void;
  setDarkMode: (enabled: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setGridColumns: (columns: 2 | 3 | 4) => void;
  setViewMode: (mode: 'gallery' | 'shorts') => void;
  setThemeColor: (hue: number, saturation: number) => void;
  setSavedMediaFilter: (filter: MediaFilter) => void;
  setHasShownInitialSplash: (shown: boolean) => void;
}

interface CachedPosts {
  posts: any[];
  tags: string;
  ratingFilter: string;
  mediaFilter: string;
  timestamp: number;
}

interface SearchState {
  currentTags: string;
  searchHistory: string[];
  cachedPosts: CachedPosts | null;
  
  setCurrentTags: (tags: string) => void;
  addToHistory: (tags: string) => void;
  clearHistory: () => void;
  setCachedPosts: (posts: any[], tags: string, ratingFilter: string, mediaFilter: string) => void;
  getCachedPosts: (tags: string, ratingFilter: string, mediaFilter: string) => any[] | null;
  clearCache: () => void;
}

// Store for tracking user's interactions with posts (votes, favorites)
interface UserInteractionsState {
  // postId -> vote (1 = liked, -1 = disliked, 0 = no vote)
  userVotes: Record<number, 1 | -1 | 0>;
  // Set of post IDs that user has favorited (tracked locally for UI updates)
  userFavorites: Set<number>;
  
  setUserVote: (postId: number, vote: 1 | -1 | 0) => void;
  getUserVote: (postId: number) => 1 | -1 | 0;
  setUserFavorite: (postId: number, isFavorite: boolean) => void;
  isUserFavorite: (postId: number) => boolean;
  clearInteractions: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      credentials: null,
      isGuest: false,
      isLoading: false,
      error: null,
      isFirstLogin: true,
      savedAccounts: [],

      login: async (username: string, apiKey: string) => {
        set({ isLoading: true, error: null });
        
        const credentials = { username, apiKey };
        e621Api.setCredentials(credentials);
        
        const isValid = await e621Api.validateCredentials();
        
        if (isValid) {
          // Save account to savedAccounts
          const existingAccounts = get().savedAccounts;
          const filteredAccounts = existingAccounts.filter(a => a.username !== username);
          const newSavedAccounts = [{ username, apiKey }, ...filteredAccounts];
          
          set((state) => ({ 
            credentials, 
            isGuest: false, 
            isLoading: false,
            isFirstLogin: state.isFirstLogin,
            savedAccounts: newSavedAccounts,
          }));
          return true;
        } else {
          e621Api.setCredentials(null);
          set({ 
            credentials: null, 
            isLoading: false, 
            error: 'Invalid username or API key' 
          });
          return false;
        }
      },

      loginWithSavedAccount: async (username: string) => {
        const savedAccount = get().savedAccounts.find(a => a.username === username);
        if (!savedAccount) {
          set({ error: 'Account non trovato' });
          return false;
        }
        
        set({ isLoading: true, error: null });
        
        const credentials = { username: savedAccount.username, apiKey: savedAccount.apiKey };
        e621Api.setCredentials(credentials);
        
        const isValid = await e621Api.validateCredentials();
        
        if (isValid) {
          set({ 
            credentials, 
            isGuest: false, 
            isLoading: false,
          });
          return true;
        } else {
          e621Api.setCredentials(null);
          set({ 
            credentials: null, 
            isLoading: false, 
            error: 'Credenziali non più valide' 
          });
          return false;
        }
      },

      removeSavedAccount: (username: string) => {
        set((state) => ({
          savedAccounts: state.savedAccounts.filter(a => a.username !== username),
        }));
      },

      loginAsGuest: () => {
        e621Api.setCredentials(null);
        set({ credentials: null, isGuest: true, error: null });
      },

      logout: () => {
        e621Api.setCredentials(null);
        set({ credentials: null, isGuest: false, error: null, isFirstLogin: true });
      },

      clearError: () => set({ error: null }),
      
      setNotFirstLogin: () => set({ isFirstLogin: false }),
    }),
    {
      name: 'e6-auth',
      partialize: (state) => ({ 
        credentials: state.credentials,
        isGuest: state.isGuest,
        isFirstLogin: state.isFirstLogin,
        savedAccounts: state.savedAccounts,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.credentials) {
          e621Api.setCredentials(state.credentials);
        }
      },
    }
  )
);

const applyThemeMode = (mode: ThemeMode) => {
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } else if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Setup listener for system theme changes
let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

const setupSystemThemeListener = (mode: ThemeMode) => {
  // Remove existing listener
  if (systemThemeListener) {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', systemThemeListener);
    systemThemeListener = null;
  }
  
  // Only add listener when in system mode
  if (mode === 'system') {
    systemThemeListener = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', systemThemeListener);
  }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ratingFilter: 'sqe',
      mediaFilter: 'all',
      darkMode: true,
      themeMode: 'dark' as ThemeMode,
      gridColumns: 2,
      viewMode: 'gallery',
      themeHue: 215,
      themeSaturation: 85,
      savedMediaFilter: 'all',
      hasShownInitialSplash: false,

      setRatingFilter: (filter) => set({ ratingFilter: filter }),
      setMediaFilter: (filter) => set({ mediaFilter: filter }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setThemeMode: (mode) => {
        applyThemeMode(mode);
        setupSystemThemeListener(mode);
        set({ themeMode: mode, darkMode: mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) });
      },
      setGridColumns: (columns) => set({ gridColumns: columns }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setThemeColor: (hue, saturation) => set({ themeHue: hue, themeSaturation: saturation }),
      setSavedMediaFilter: (filter) => set({ savedMediaFilter: filter }),
      setHasShownInitialSplash: (shown) => set({ hasShownInitialSplash: shown }),
    }),
    {
      name: 'e6-settings',
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version < 4 && persistedState && typeof persistedState === 'object') {
          return {
            ...persistedState,
            ratingFilter: persistedState.ratingFilter ?? 'sqe',
            themeMode: persistedState.darkMode ? 'dark' : 'light',
            hasShownInitialSplash: false,
          };
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        // Reset splash flag on app start
        if (state) {
          state.hasShownInitialSplash = false;
        }
        // Apply saved theme on rehydration
        if (state?.themeHue !== undefined && state?.themeSaturation !== undefined) {
          document.documentElement.style.setProperty('--primary', `${state.themeHue} ${state.themeSaturation}% 55%`);
          document.documentElement.style.setProperty('--ring', `${state.themeHue} ${state.themeSaturation}% 55%`);
          document.documentElement.style.setProperty('--accent', `${(state.themeHue + 20) % 360} ${state.themeSaturation}% 55%`);
        }
        // Apply theme mode
        if (state?.themeMode) {
          applyThemeMode(state.themeMode);
          setupSystemThemeListener(state.themeMode);
        } else if (state?.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }
  )
);

const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      currentTags: '',
      searchHistory: [],
      cachedPosts: null,

      setCurrentTags: (tags) => set({ currentTags: tags }),
      
      addToHistory: (tags) => set((state) => {
        if (!tags.trim()) return state;
        const filtered = state.searchHistory.filter(t => t !== tags);
        return { 
          searchHistory: [tags, ...filtered].slice(0, 20) 
        };
      }),
      
      clearHistory: () => set({ searchHistory: [] }),

      setCachedPosts: (posts, tags, ratingFilter, mediaFilter) => set({
        cachedPosts: {
          posts,
          tags,
          ratingFilter,
          mediaFilter,
          timestamp: Date.now(),
        }
      }),

      getCachedPosts: (tags, ratingFilter, mediaFilter) => {
        const cached = get().cachedPosts;
        if (!cached) return null;
        
        // Check if cache matches current filters
        if (cached.tags !== tags || cached.ratingFilter !== ratingFilter || cached.mediaFilter !== mediaFilter) {
          return null;
        }
        
        // Check if cache is still valid (30 min)
        if (Date.now() - cached.timestamp > CACHE_MAX_AGE) {
          return null;
        }
        
        return cached.posts;
      },

      clearCache: () => set({ cachedPosts: null }),
    }),
    {
      name: 'e6-search',
      partialize: (state) => ({
        currentTags: state.currentTags,
        searchHistory: state.searchHistory,
        cachedPosts: state.cachedPosts,
      }),
    }
  )
);

// User interactions store - persisted to remember votes across sessions
export const useUserInteractionsStore = create<UserInteractionsState>()(
  persist(
    (set, get) => ({
      userVotes: {},
      userFavorites: new Set<number>(),

      setUserVote: (postId, vote) => set((state) => ({
        userVotes: { ...state.userVotes, [postId]: vote }
      })),

      getUserVote: (postId) => get().userVotes[postId] || 0,

      setUserFavorite: (postId, isFavorite) => set((state) => {
        const newFavorites = new Set(state.userFavorites);
        if (isFavorite) {
          newFavorites.add(postId);
        } else {
          newFavorites.delete(postId);
        }
        return { userFavorites: newFavorites };
      }),

      isUserFavorite: (postId) => get().userFavorites.has(postId),

      clearInteractions: () => set({ userVotes: {}, userFavorites: new Set<number>() }),
    }),
    {
      name: 'e6-interactions',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert userFavorites array back to Set
          if (parsed.state?.userFavorites) {
            parsed.state.userFavorites = new Set(parsed.state.userFavorites);
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Convert Set to array for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              userFavorites: Array.from(value.state.userFavorites || []),
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
