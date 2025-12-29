import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
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
  storageLimitMB: number; // Storage limit in megabytes (GLOBAL, not per-user)
  
  setRatingFilter: (filter: RatingFilter) => void;
  setMediaFilter: (filter: MediaFilter) => void;
  setDarkMode: (enabled: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setGridColumns: (columns: 2 | 3 | 4) => void;
  setViewMode: (mode: 'gallery' | 'shorts') => void;
  setThemeColor: (hue: number, saturation: number) => void;
  setSavedMediaFilter: (filter: MediaFilter) => void;
  setHasShownInitialSplash: (shown: boolean) => void;
  setStorageLimitMB: (limit: number) => void;
}

interface CachedPosts {
  posts: any[];
  tags: string;
  ratingFilter: string;
  mediaFilter: string;
  timestamp: number;
}

export interface SavedSearch {
  id: string;
  tags: string;
  name: string;
  createdAt: number;
}

interface SearchState {
  currentTags: string;
  searchHistory: string[];
  cachedPosts: CachedPosts | null;
  savedSearches: SavedSearch[];
  
  setCurrentTags: (tags: string) => void;
  addToHistory: (tags: string) => void;
  clearHistory: () => void;
  setCachedPosts: (posts: any[], tags: string, ratingFilter: string, mediaFilter: string) => void;
  getCachedPosts: (tags: string, ratingFilter: string, mediaFilter: string) => any[] | null;
  clearCache: () => void;
  addSavedSearch: (tags: string, name?: string) => void;
  removeSavedSearch: (id: string) => void;
  renameSavedSearch: (id: string, newName: string) => void;
  updateSavedSearchTags: (id: string, newTags: string) => void;
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

// Helper function to get current username from auth store
const getCurrentUsername = (): string => {
  try {
    const authData = localStorage.getItem('e6-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.credentials?.username || 'guest';
    }
  } catch (e) {
    // Ignore
  }
  return 'guest';
};

// Create user-specific storage for settings
const createUserSettingsStorage = (): StateStorage => ({
  getItem: (name: string): string | null => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    return localStorage.getItem(key);
  },
  setItem: (name: string, value: string): void => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    localStorage.setItem(key, value);
  },
  removeItem: (name: string): void => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    localStorage.removeItem(key);
  },
});

// Create user-specific storage for search data
const createUserSearchStorage = (): StateStorage => ({
  getItem: (name: string): string | null => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    return localStorage.getItem(key);
  },
  setItem: (name: string, value: string): void => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    localStorage.setItem(key, value);
  },
  removeItem: (name: string): void => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    localStorage.removeItem(key);
  },
});

// Create user-specific storage for interactions
const createUserInteractionsStorage = (): StateStorage => ({
  getItem: (name: string): string | null => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    return localStorage.getItem(key);
  },
  setItem: (name: string, value: string): void => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    localStorage.setItem(key, value);
  },
  removeItem: (name: string): void => {
    const username = getCurrentUsername();
    const key = `${name}-${username}`;
    localStorage.removeItem(key);
  },
});

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
          
          // Reload user-specific stores after login
          reloadUserStores();
          
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
          
          // Reload user-specific stores after login
          reloadUserStores();
          
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
        // Reload user-specific stores for guest
        reloadUserStores();
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

// Initialize theme on app start (before store hydration)
export const initializeTheme = () => {
  // Get stored theme mode from localStorage for current user
  const username = getCurrentUsername();
  const storedSettings = localStorage.getItem(`e6-settings-${username}`);
  let themeMode: ThemeMode = 'system'; // Default to system
  
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);
      themeMode = parsed.state?.themeMode || 'system';
    } catch (e) {
      // Use default
    }
  }
  
  applyThemeMode(themeMode);
  setupSystemThemeListener(themeMode);
};

// Global storage limit store (not per-user)
interface GlobalSettingsState {
  storageLimitMB: number;
  setStorageLimitMB: (limit: number) => void;
}

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
  persist(
    (set) => ({
      storageLimitMB: 500, // Default 500MB
      setStorageLimitMB: (limit) => set({ storageLimitMB: limit }),
    }),
    {
      name: 'e6-global-settings',
    }
  )
);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ratingFilter: 'sqe',
      mediaFilter: 'all',
      darkMode: true,
      themeMode: 'system' as ThemeMode, // Default to system theme
      gridColumns: 2,
      viewMode: 'gallery',
      themeHue: 215,
      themeSaturation: 85,
      savedMediaFilter: 'all',
      hasShownInitialSplash: false,
      storageLimitMB: 500, // Kept for compatibility but use useGlobalSettingsStore

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
      setStorageLimitMB: (limit) => {
        // Also update global settings for cache limit
        useGlobalSettingsStore.getState().setStorageLimitMB(limit);
        set({ storageLimitMB: limit });
      },
    }),
    {
      name: 'e6-settings',
      storage: createJSONStorage(() => createUserSettingsStorage()),
      version: 6,
      migrate: (persistedState: any, version: number) => {
        if (version < 6 && persistedState && typeof persistedState === 'object') {
          return {
            ...persistedState,
            ratingFilter: persistedState.ratingFilter ?? 'sqe',
            themeMode: persistedState.themeMode ?? (persistedState.darkMode ? 'dark' : 'system'),
            hasShownInitialSplash: false,
            storageLimitMB: persistedState.storageLimitMB ?? 500,
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
      savedSearches: [],

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

      addSavedSearch: (tags, name) => set((state) => {
        // Check if already exists
        if (state.savedSearches.some(s => s.tags === tags)) {
          return state;
        }
        const newSearch: SavedSearch = {
          id: Date.now().toString(),
          tags,
          name: name || '',
          createdAt: Date.now(),
        };
        return {
          savedSearches: [newSearch, ...state.savedSearches].slice(0, 20)
        };
      }),

      removeSavedSearch: (id) => set((state) => ({
        savedSearches: state.savedSearches.filter(s => s.id !== id)
      })),

      renameSavedSearch: (id, newName) => set((state) => ({
        savedSearches: state.savedSearches.map(s => 
          s.id === id ? { ...s, name: newName } : s
        )
      })),

      updateSavedSearchTags: (id, newTags) => set((state) => ({
        savedSearches: state.savedSearches.map(s => 
          s.id === id ? { ...s, tags: newTags } : s
        )
      })),
    }),
    {
      name: 'e6-search',
      storage: createJSONStorage(() => createUserSearchStorage()),
      partialize: (state) => ({
        currentTags: state.currentTags,
        searchHistory: state.searchHistory,
        cachedPosts: state.cachedPosts,
        savedSearches: state.savedSearches,
      }),
    }
  )
);

// User interactions store - persisted to remember votes across sessions (per-user)
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
          const username = getCurrentUsername();
          const key = `${name}-${username}`;
          const str = localStorage.getItem(key);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert userFavorites array back to Set
          if (parsed.state?.userFavorites) {
            parsed.state.userFavorites = new Set(parsed.state.userFavorites);
          }
          return parsed;
        },
        setItem: (name, value) => {
          const username = getCurrentUsername();
          const key = `${name}-${username}`;
          // Convert Set to array for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              userFavorites: Array.from(value.state.userFavorites || []),
            },
          };
          localStorage.setItem(key, JSON.stringify(toStore));
        },
        removeItem: (name) => {
          const username = getCurrentUsername();
          const key = `${name}-${username}`;
          localStorage.removeItem(key);
        },
      },
    }
  )
);

// Function to reload user-specific stores after login/logout
const reloadUserStores = () => {
  // Force rehydration of user-specific stores
  // This is a workaround since zustand persist doesn't support dynamic keys natively
  const settingsState = useSettingsStore.getState();
  const searchState = useSearchStore.getState();
  const interactionsState = useUserInteractionsStore.getState();
  
  // Trigger a rehydration by reading from new user's storage
  const username = getCurrentUsername();
  
  // Settings
  const settingsData = localStorage.getItem(`e6-settings-${username}`);
  if (settingsData) {
    try {
      const parsed = JSON.parse(settingsData);
      if (parsed.state) {
        useSettingsStore.setState({
          ...parsed.state,
          hasShownInitialSplash: false,
        });
        // Apply theme
        if (parsed.state.themeHue !== undefined && parsed.state.themeSaturation !== undefined) {
          document.documentElement.style.setProperty('--primary', `${parsed.state.themeHue} ${parsed.state.themeSaturation}% 55%`);
          document.documentElement.style.setProperty('--ring', `${parsed.state.themeHue} ${parsed.state.themeSaturation}% 55%`);
          document.documentElement.style.setProperty('--accent', `${(parsed.state.themeHue + 20) % 360} ${parsed.state.themeSaturation}% 55%`);
        }
        if (parsed.state.themeMode) {
          applyThemeMode(parsed.state.themeMode);
          setupSystemThemeListener(parsed.state.themeMode);
        }
      }
    } catch (e) {
      // Reset to defaults for new user
      useSettingsStore.setState({
        ratingFilter: 'sqe',
        mediaFilter: 'all',
        darkMode: true,
        themeMode: 'system',
        gridColumns: 2,
        viewMode: 'gallery',
        themeHue: 215,
        themeSaturation: 85,
        savedMediaFilter: 'all',
        hasShownInitialSplash: false,
        storageLimitMB: 500,
      });
    }
  } else {
    // Reset to defaults for new user
    useSettingsStore.setState({
      ratingFilter: 'sqe',
      mediaFilter: 'all',
      darkMode: true,
      themeMode: 'system',
      gridColumns: 2,
      viewMode: 'gallery',
      themeHue: 215,
      themeSaturation: 85,
      savedMediaFilter: 'all',
      hasShownInitialSplash: false,
      storageLimitMB: 500,
    });
  }
  
  // Search
  const searchData = localStorage.getItem(`e6-search-${username}`);
  if (searchData) {
    try {
      const parsed = JSON.parse(searchData);
      if (parsed.state) {
        useSearchStore.setState(parsed.state);
      }
    } catch (e) {
      // Reset to defaults
      useSearchStore.setState({
        currentTags: '',
        searchHistory: [],
        cachedPosts: null,
        savedSearches: [],
      });
    }
  } else {
    // Reset to defaults for new user
    useSearchStore.setState({
      currentTags: '',
      searchHistory: [],
      cachedPosts: null,
      savedSearches: [],
    });
  }
  
  // Interactions
  const interactionsData = localStorage.getItem(`e6-interactions-${username}`);
  if (interactionsData) {
    try {
      const parsed = JSON.parse(interactionsData);
      if (parsed.state) {
        useUserInteractionsStore.setState({
          ...parsed.state,
          userFavorites: new Set(parsed.state.userFavorites || []),
        });
      }
    } catch (e) {
      // Reset to defaults
      useUserInteractionsStore.setState({
        userVotes: {},
        userFavorites: new Set<number>(),
      });
    }
  } else {
    // Reset to defaults for new user
    useUserInteractionsStore.setState({
      userVotes: {},
      userFavorites: new Set<number>(),
    });
  }
  
  // Re-initialize theme for new user
  initializeTheme();
};
