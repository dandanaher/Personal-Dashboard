import { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Sun, Moon, Check, Palette } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, APP_COLORS } from '@/stores/themeStore';

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuthStore();
  const { accentColor, setAccentColor, darkMode, toggleDarkMode } = useThemeStore();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button - glass pill style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-secondary-800/80 backdrop-blur-sm border border-secondary-200 dark:border-secondary-700 shadow-sm hover:shadow-md transition-all duration-200"
        aria-label="Settings menu"
      >
        <Settings className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
        <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
          Settings
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-lg z-50 overflow-hidden">
          {/* Theme Toggle */}
          <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-2 mb-3">
              {darkMode ? (
                <Moon className="h-4 w-4 text-secondary-500" />
              ) : (
                <Sun className="h-4 w-4 text-secondary-500" />
              )}
              <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Theme
              </span>
            </div>
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
            >
              <div
                className="relative w-10 h-6 rounded-full transition-colors duration-200"
                style={{ backgroundColor: darkMode ? accentColor : '#d1d5db' }}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                    darkMode ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                >
                  {darkMode ? (
                    <Moon className="w-3 h-3 text-secondary-600" />
                  ) : (
                    <Sun className="w-3 h-3 text-secondary-600" />
                  )}
                </div>
              </div>
              <span className="text-sm text-secondary-600 dark:text-secondary-400">
                {darkMode ? 'Dark mode' : 'Light mode'}
              </span>
            </button>
          </div>

          {/* Accent Color */}
          <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="h-4 w-4 text-secondary-500" />
              <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Accent Color
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {APP_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`
                    relative w-8 h-8 rounded-full border-2 transition-all duration-150
                    hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${accentColor === color.value
                      ? 'border-secondary-900 dark:border-white scale-110'
                      : 'border-transparent'
                    }
                  `}
                  style={{
                    backgroundColor: color.value,
                    '--tw-ring-color': color.value,
                  } as React.CSSProperties}
                  onClick={() => setAccentColor(color.value)}
                  aria-label={`Select ${color.name} color`}
                >
                  {accentColor === color.value && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow-md" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sign Out */}
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsMenu;
