import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Same colors as habits page
export const APP_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#D97757' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Cyan', value: '#06b6d4' },
  // Pastel versions
  { name: 'Pastel Blue', value: '#a5c9f5' },
  { name: 'Pastel Green', value: '#7bd4b6' },
  { name: 'Pastel Red', value: '#f5a5a5' },
  { name: 'Pastel Purple', value: '#c4a7e7' },
  { name: 'Pastel Pink', value: '#f5a6d3' },
  { name: 'Pastel Orange', value: '#fbb984' },
  { name: 'Pastel Teal', value: '#7dd4c7' },
  { name: 'Pastel Yellow', value: '#f5d77e' },
  { name: 'Pastel Indigo', value: '#a5a9f5' },
  { name: 'Pastel Cyan', value: '#7dd7ea' },
] as const;

interface ThemeState {
  accentColor: string;
  darkMode: boolean;
  setAccentColor: (color: string) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

// Get initial dark mode state from localStorage or system preference
const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accentColor: '#3b82f6', // Default blue
      darkMode: getInitialDarkMode(),
      setAccentColor: (color: string) => {
        set({ accentColor: color });
        // Update CSS custom property for global access
        document.documentElement.style.setProperty('--accent-color', color);
      },
      toggleDarkMode: () => {
        const newDarkMode = !get().darkMode;
        set({ darkMode: newDarkMode });
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
          localStorage.theme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.theme = 'light';
        }
      },
      setDarkMode: (isDark: boolean) => {
        set({ darkMode: isDark });
        if (isDark) {
          document.documentElement.classList.add('dark');
          localStorage.theme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.theme = 'light';
        }
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply the persisted color on rehydration
        if (state?.accentColor) {
          document.documentElement.style.setProperty('--accent-color', state.accentColor);
        }
        // Apply the persisted dark mode on rehydration
        if (state?.darkMode !== undefined) {
          if (state.darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
          } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
          }
        }
      },
    }
  )
);

// Helper function to get lighter/darker variants
export function getColorVariants(hexColor: string) {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  return {
    base: hexColor,
    light: `rgba(${r}, ${g}, ${b}, 0.1)`,
    medium: `rgba(${r}, ${g}, ${b}, 0.2)`,
    hover: `rgba(${r}, ${g}, ${b}, 0.8)`,
  };
}
