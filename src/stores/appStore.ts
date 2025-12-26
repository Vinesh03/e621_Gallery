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

interface SettingsState {
  ratingFilter: RatingFilter;
  mediaFilter: MediaFilter;
  darkMode: boolean;
  gridColumns: 2 | 3 | 4;
  viewMode: 'gallery' | 'shorts';
  themeHue: number;
  themeSaturation: number;
  savedMediaFilter: MediaFilter; // Saved filter before switching to shorts
  
  setRatingFilter: (filter: RatingFilter) => void;
  setMediaFilter: (filter: MediaFilter) => void;
  setDarkMode: (enabled: boolean) => void;
  setGridColumns: (columns: 2 | 3 | 4) => void;
  setViewMode: (mode: 'gallery' | 'shorts') => void;
  setThemeColor: (hue: number, saturation: number) => void;
  setSavedMediaFilter: (filter: MediaFilter) => void;
}

interface SearchState {
  currentTags: string;
  searchHistory: string[];
  
  setCurrentTags: (tags: string) => void;
  addToHistory: (tags: string) => void;
  clearHistory: () => void;
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ratingFilter: 'sqe',
      mediaFilter: 'all',
      darkMode: true,
      gridColumns: 2,
      viewMode: 'gallery',
      themeHue: 215,
      themeSaturation: 85,
      savedMediaFilter: 'all',

      setRatingFilter: (filter) => set({ ratingFilter: filter }),
      setMediaFilter: (filter) => set({ mediaFilter: filter }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setGridColumns: (columns) => set({ gridColumns: columns }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setThemeColor: (hue, saturation) => set({ themeHue: hue, themeSaturation: saturation }),
      setSavedMediaFilter: (filter) => set({ savedMediaFilter: filter }),
    }),
    {
      name: 'e6-settings',
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version < 3 && persistedState && typeof persistedState === 'object') {
          return {
            ...persistedState,
            ratingFilter: persistedState.ratingFilter ?? 'sqe',
          };
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        // Apply saved theme on rehydration
        if (state?.themeHue !== undefined && state?.themeSaturation !== undefined) {
          document.documentElement.style.setProperty('--primary', `${state.themeHue} ${state.themeSaturation}% 55%`);
          document.documentElement.style.setProperty('--ring', `${state.themeHue} ${state.themeSaturation}% 55%`);
          document.documentElement.style.setProperty('--accent', `${(state.themeHue + 20) % 360} ${state.themeSaturation}% 55%`);
        }
        // Apply dark mode
        if (state?.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }
  )
);

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      currentTags: '',
      searchHistory: [],

      setCurrentTags: (tags) => set({ currentTags: tags }),
      
      addToHistory: (tags) => set((state) => {
        if (!tags.trim()) return state;
        const filtered = state.searchHistory.filter(t => t !== tags);
        return { 
          searchHistory: [tags, ...filtered].slice(0, 20) 
        };
      }),
      
      clearHistory: () => set({ searchHistory: [] }),
    }),
    {
      name: 'e6-search',
    }
  )
);
