import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Same colors as habits page
export const APP_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Cyan', value: '#06b6d4' },
] as const;

interface ThemeState {
  accentColor: string;
  setAccentColor: (color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentColor: '#3b82f6', // Default blue
      setAccentColor: (color: string) => {
        set({ accentColor: color });
        // Update CSS custom property for global access
        document.documentElement.style.setProperty('--accent-color', color);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply the persisted color on rehydration
        if (state?.accentColor) {
          document.documentElement.style.setProperty('--accent-color', state.accentColor);
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
