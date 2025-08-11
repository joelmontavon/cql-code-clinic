import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const initialState = {
  theme: 'system',
  sidebarCollapsed: false,
  isLoading: false,
  loadingText: undefined,
  errors: [],
  bookmarksOpen: false,
  settingsOpen: false,
  currentView: 'exercise',
};

export const useUIStore = create()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Theme actions
      setTheme: (theme) => {
        set({ theme }, false, 'setTheme');
        // Persist theme preference
        localStorage.setItem('cql-clinic-theme', theme);
      },

      toggleSidebar: () => {
        set(
          (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
          false,
          'toggleSidebar'
        );
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed');
      },

      // Loading actions
      setLoading: (isLoading, text) => {
        set({ isLoading, loadingText: text }, false, 'setLoading');
      },

      // Error management
      addError: (error) => {
        const newError = {
          ...error,
          id: Math.random().toString(36).substring(2, 15),
          timestamp: new Date(),
        };
        
        set(
          (state) => ({ errors: [newError, ...state.errors] }),
          false,
          'addError'
        );

        // Auto-dismiss info messages after 5 seconds
        if (error.type === 'info' && error.dismissible !== false) {
          setTimeout(() => {
            get().removeError(newError.id);
          }, 5000);
        }
      },

      removeError: (id) => {
        set(
          (state) => ({ errors: state.errors.filter(e => e.id !== id) }),
          false,
          'removeError'
        );
      },

      clearErrors: () => {
        set({ errors: [] }, false, 'clearErrors');
      },

      // Drawer actions
      setBookmarksOpen: (open) => {
        set({ bookmarksOpen: open }, false, 'setBookmarksOpen');
      },

      setSettingsOpen: (open) => {
        set({ settingsOpen: open }, false, 'setSettingsOpen');
      },

      // View actions
      setCurrentView: (view) => {
        set({ currentView: view }, false, 'setCurrentView');
      },
    }),
    {
      name: 'ui-store',
    }
  )
);

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('cql-clinic-theme');
if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
  useUIStore.getState().setTheme(savedTheme);
}