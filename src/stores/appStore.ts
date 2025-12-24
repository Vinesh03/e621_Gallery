import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthCredentials, RatingFilter, MediaFilter } from '@/types/e621';
import { e621Api } from '@/services/e621Api';

interface AuthState {
  credentials: AuthCredentials | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  isFirstLogin: boolean;
  
  login: (username: string, apiKey: string) => Promise<boolean>;
  loginAsGuest: () => void;
  logout: () => void;
  clearError: () => void;
  setNotFirstLogin: () => void;
}

interface SettingsState {
  ratingFilter: RatingFilter;
  mediaFilter: MediaFilter;
  darkMode: boolean;
  gridColumns: 2 | 3 | 4;
  viewMode: 'gallery' | 'shorts';
  themeHue: number;
  themeSaturation: number;
  
  setRatingFilter: (filter: RatingFilter) => void;
  setMediaFilter: (filter: MediaFilter) => void;
  setDarkMode: (enabled: boolean) => void;
  setGridColumns: (columns: 2 | 3 | 4) => void;
  setViewMode: (mode: 'gallery' | 'shorts') => void;
  setThemeColor: (hue: number, saturation: number) => void;
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
    (set) => ({
      credentials: null,
      isGuest: false,
      isLoading: false,
      error: null,
      isFirstLogin: true,

      login: async (username: string, apiKey: string) => {
        set({ isLoading: true, error: null });
        
        const credentials = { username, apiKey };
        e621Api.setCredentials(credentials);
        
        const isValid = await e621Api.validateCredentials();
        
        if (isValid) {
          set((state) => ({ 
            credentials, 
            isGuest: false, 
            isLoading: false,
            isFirstLogin: state.isFirstLogin
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
      ratingFilter: 's',
      mediaFilter: 'all',
      darkMode: true,
      gridColumns: 2,
      viewMode: 'gallery',
      themeHue: 215,
      themeSaturation: 85,

      setRatingFilter: (filter) => set({ ratingFilter: filter }),
      setMediaFilter: (filter) => set({ mediaFilter: filter }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setGridColumns: (columns) => set({ gridColumns: columns }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setThemeColor: (hue, saturation) => set({ themeHue: hue, themeSaturation: saturation }),
    }),
    {
      name: 'e6-settings',
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
