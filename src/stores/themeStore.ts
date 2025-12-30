import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateFavicon } from '../utils/faviconUtils';

// Same colors as habits page
export const APP_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#d97757' },
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
  stylePreset: 'modern' | 'retro';
  setAccentColor: (color: string) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  setStylePreset: (style: 'modern' | 'retro') => void;
}

// Get initial dark mode state from localStorage or system preference
const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
};

// Style Variables
const MODERN_VARS = {
  '--radius-none': '0px',
  '--radius-sm': '0.125rem',
  '--radius-default': '0.25rem',
  '--radius-md': '0.375rem',
  '--radius-lg': '0.5rem',
  '--radius-xl': '0.75rem',
  '--radius-2xl': '1rem',
  '--radius-3xl': '0.75rem',
  '--radius-full': '9999px',
  '--font-sans': 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  '--color-light-bg': '#FAF8F5',
  // Slate Colors
  '--color-secondary-50': '250 250 250',
  '--color-secondary-100': '240 240 240',
  '--color-secondary-200': '224 224 224',
  '--color-secondary-300': '192 192 192',
  '--color-secondary-400': '160 160 160',
  '--color-secondary-500': '128 128 128',
  '--color-secondary-600': '100 100 100',
  '--color-secondary-700': '75 75 75',
  '--color-secondary-800': '50 50 50',
  '--color-secondary-900': '33 33 33',
  '--color-secondary-950': '18 18 18',
};

const RETRO_VARS = {
  '--radius-none': '0px',
  '--radius-sm': '0px',
  '--radius-default': '0px',
  '--radius-md': '0px',
  '--radius-lg': '0px',
  '--radius-xl': '0px',
  '--radius-2xl': '0px',
  '--radius-3xl': '0px',
  '--radius-full': '0px',
  '--font-sans': '"Courier New", Courier, "Lucida Sans Typewriter", "Lucida Console", monospace',
  '--color-light-bg': 'rgb(245, 245, 245)',
  // High Contrast Grayscale
  '--color-secondary-50': '255 255 255',
  '--color-secondary-100': '245 245 245',
  '--color-secondary-200': '220 220 220',
  '--color-secondary-300': '190 190 190',
  '--color-secondary-400': '160 160 160',
  '--color-secondary-500': '128 128 128',
  '--color-secondary-600': '96 96 96',
  '--color-secondary-700': '64 64 64',
  '--color-secondary-800': '32 32 32',
  '--color-secondary-900': '16 16 16',
  '--color-secondary-950': '0 0 0',
};

function applyThemeVariables(style: 'modern' | 'retro') {
  const vars = style === 'retro' ? RETRO_VARS : MODERN_VARS;
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

// Update the PWA theme-color meta tag for window header color
function updateThemeColorMeta(color: string) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', color);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accentColor: '#3b82f6', // Default blue
      darkMode: getInitialDarkMode(),
      stylePreset: 'modern',
      setAccentColor: (color: string) => {
        set({ accentColor: color });
        // Update CSS custom property for global access
        document.documentElement.style.setProperty('--accent-color', color);
        // Update PWA window header color
        updateThemeColorMeta(color);
        // Update favicon with new accent color
        const { darkMode, stylePreset } = get();
        updateFavicon(color, darkMode, stylePreset);
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
        // Update favicon with new dark mode
        const { accentColor, stylePreset } = get();
        updateFavicon(accentColor, newDarkMode, stylePreset);
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
        // Update favicon with new dark mode
        const { accentColor, stylePreset } = get();
        updateFavicon(accentColor, isDark, stylePreset);
      },
      setStylePreset: (style: 'modern' | 'retro') => {
        const currentStyle = get().stylePreset;
        document.documentElement.classList.remove(`style-${currentStyle}`);
        set({ stylePreset: style });
        document.documentElement.classList.add(`style-${style}`);
        applyThemeVariables(style);
        // Update favicon with new style preset
        const { accentColor, darkMode } = get();
        updateFavicon(accentColor, darkMode, style);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply the persisted color on rehydration
        if (state?.accentColor) {
          document.documentElement.style.setProperty('--accent-color', state.accentColor);
          updateThemeColorMeta(state.accentColor);
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
        // Apply the persisted style preset on rehydration
        if (state?.stylePreset) {
          document.documentElement.classList.add(`style-${state.stylePreset}`);
          applyThemeVariables(state.stylePreset);
        } else {
          // Default to modern if not set
          document.documentElement.classList.add('style-modern');
          applyThemeVariables('modern');
        }
        // Update favicon with persisted theme values
        const accentColor = state?.accentColor || '#3b82f6';
        const darkMode = state?.darkMode ?? getInitialDarkMode();
        const stylePreset = state?.stylePreset || 'modern';
        updateFavicon(accentColor, darkMode, stylePreset);
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
