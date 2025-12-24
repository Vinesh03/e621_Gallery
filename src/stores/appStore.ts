import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthCredentials, RatingFilter } from '@/types/e621';
import { e621Api } from '@/services/e621Api';

interface AuthState {
  credentials: AuthCredentials | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (username: string, apiKey: string) => Promise<boolean>;
  loginAsGuest: () => void;
  logout: () => void;
  clearError: () => void;
}

interface SettingsState {
  ratingFilter: RatingFilter;
  darkMode: boolean;
  gridColumns: 2 | 3 | 4;
  
  setRatingFilter: (filter: RatingFilter) => void;
  setDarkMode: (enabled: boolean) => void;
  setGridColumns: (columns: 2 | 3 | 4) => void;
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

      login: async (username: string, apiKey: string) => {
        set({ isLoading: true, error: null });
        
        const credentials = { username, apiKey };
        e621Api.setCredentials(credentials);
        
        const isValid = await e621Api.validateCredentials();
        
        if (isValid) {
          set({ credentials, isGuest: false, isLoading: false });
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
        set({ credentials: null, isGuest: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'e6-auth',
      partialize: (state) => ({ 
        credentials: state.credentials,
        isGuest: state.isGuest,
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
      darkMode: true,
      gridColumns: 2,

      setRatingFilter: (filter) => set({ ratingFilter: filter }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      setGridColumns: (columns) => set({ gridColumns: columns }),
    }),
    {
      name: 'e6-settings',
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
