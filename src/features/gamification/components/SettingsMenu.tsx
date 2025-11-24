import { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Sun, Moon, Check, Palette, User, Pencil } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, APP_COLORS } from '@/stores/themeStore';
import { useProfileStore } from '@/stores/profileStore';

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, signOut } = useAuthStore();
  const { accentColor, setAccentColor, darkMode, toggleDarkMode } = useThemeStore();
  const { profile, updateProfile } = useProfileStore();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingUsername(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (isEditingUsername && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingUsername]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleEditUsername = () => {
    setNewUsername(profile?.username || '');
    setIsEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    if (!user || savingUsername) return;

    setSavingUsername(true);
    try {
      await updateProfile(user.id, { username: newUsername.trim() || null });
      setIsEditingUsername(false);
    } catch (error) {
      console.error('Error saving username:', error);
    } finally {
      setSavingUsername(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingUsername(false);
    setNewUsername('');
  };

  const displayUsername = profile?.username || user?.email?.split('@')[0] || 'User';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button - glass pill style matching BottomNav */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 shadow-lg shadow-black/5 hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-200"
        aria-label="Settings menu"
      >
        <Settings className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
        <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
          Settings
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-3xl border border-white/40 dark:border-white/20 shadow-lg shadow-black/5 z-50 overflow-hidden">
          {/* Username */}
          <div className="p-4 border-b border-white/30 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-secondary-500" />
              <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Username
              </span>
            </div>
            {isEditingUsername ? (
              <div className="space-y-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white/50 dark:bg-white/10 border border-white/40 dark:border-white/20 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-0"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveUsername();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveUsername}
                    disabled={savingUsername}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                  >
                    {savingUsername ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary-200 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleEditUsername}
                className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
              >
                <span className="text-sm text-secondary-700 dark:text-secondary-300 truncate">
                  {displayUsername}
                </span>
                <Pencil className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" />
              </button>
            )}
          </div>

          {/* Theme Toggle */}
          <div className="p-4 border-b border-white/30 dark:border-white/10">
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
              className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
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
          <div className="p-4 border-b border-white/30 dark:border-white/10">
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
                    ${
                      accentColor === color.value
                        ? 'border-secondary-900 dark:border-white scale-110'
                        : 'border-transparent'
                    }
                  `}
                  style={
                    {
                      backgroundColor: color.value,
                      '--tw-ring-color': color.value,
                    } as React.CSSProperties
                  }
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
              className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-colors"
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
