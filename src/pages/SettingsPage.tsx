import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Pencil,
  Sun,
  Moon,
  Layers,
  Palette,
  Bell,
  LogOut,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, APP_COLORS } from '@/stores/themeStore';
import { useProfileStore } from '@/stores/profileStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { NotificationSettings } from '@/features/notifications';

type SettingsSection = 'profile' | 'appearance' | 'notifications';

interface SectionConfig {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

const sections: SectionConfig[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="h-4 w-4 flex-shrink-0" />,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: <Palette className="h-4 w-4 flex-shrink-0" />,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell className="h-4 w-4 flex-shrink-0" />,
  },
];

// Profile Section Component (includes sign out)
function ProfileSection() {
  const { user, signOut } = useAuthStore();
  const { profile, updateProfile } = useProfileStore();
  const { accentColor } = useThemeStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const displayUsername = profile?.username || user?.email?.split('@')[0] || 'User';

  const handleEdit = () => {
    setNewUsername(profile?.username || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { username: newUsername.trim() || null });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving username:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewUsername('');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-3">
          Username
        </h3>
        {isEditing ? (
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-3 text-base rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600 transition-colors"
          >
            <span className="text-base text-secondary-900 dark:text-white">
              {displayUsername}
            </span>
            <Pencil className="h-4 w-4 text-secondary-400" />
          </button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-3">
          Email
        </h3>
        <div className="p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 border border-secondary-200 dark:border-secondary-700">
          <span className="text-base text-secondary-600 dark:text-secondary-400">
            {user?.email || 'Not available'}
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-3">
          Account
        </h3>
        <button
          onClick={() => void handleSignOut()}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-base font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

// Appearance Section Component
function AppearanceSection() {
  const { accentColor, setAccentColor, darkMode, toggleDarkMode, stylePreset, setStylePreset } =
    useThemeStore();

  return (
    <div className="space-y-6">
      {/* Theme Toggle */}
      <div>
        <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-3">
          Theme
        </h3>
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Moon className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
            ) : (
              <Sun className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
            )}
            <span className="text-base text-secondary-900 dark:text-white">
              {darkMode ? 'Dark mode' : 'Light mode'}
            </span>
          </div>
          <div
            className="relative w-12 h-7 rounded-full transition-colors duration-200"
            style={{ backgroundColor: darkMode ? accentColor : '#d1d5db' }}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                darkMode ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            >
              {darkMode ? (
                <Moon className="w-3.5 h-3.5 text-secondary-600" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-secondary-600" />
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Style Preset */}
      <div>
        <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-3">
          Style
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(['modern', 'retro'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setStylePreset(style)}
              className={`
                p-4 rounded-xl text-base font-medium capitalize transition-all duration-200 border
                ${
                  stylePreset === style
                    ? 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 shadow-sm'
                    : 'bg-secondary-50 dark:bg-secondary-800/50 border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600'
                }
              `}
              style={stylePreset === style ? { borderColor: accentColor } : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-secondary-500" />
                  <span className="text-secondary-900 dark:text-white">{style}</span>
                </div>
                {stylePreset === style && (
                  <Check className="h-4 w-4" style={{ color: accentColor }} />
                )}
              </div>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 text-left">
                {style === 'modern' ? 'Rounded corners' : 'Sharp corners, monospace'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-3">
          Accent Color
        </h3>
        <div className="p-4 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {APP_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`
                  relative w-9 h-9 rounded-full border-2 transition-all duration-150
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
      </div>
    </div>
  );
}

// Notifications Section Component
function NotificationsSection() {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700">
      <NotificationSettings />
    </div>
  );
}

// Section Content Renderer
function SectionContent({ section }: { section: SettingsSection }) {
  switch (section) {
    case 'profile':
      return <ProfileSection />;
    case 'appearance':
      return <AppearanceSection />;
    case 'notifications':
      return <NotificationsSection />;
    default:
      return null;
  }
}

function SettingsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const { accentColor } = useThemeStore();
  const { isCollapsed } = useSidebarStore();

  const handleBack = () => {
    navigate(-1);
  };

  // Desktop layout positioning (matches HomePage pattern)
  const desktopClasses = `hidden lg:flex fixed inset-0 ${
    isCollapsed ? 'lg:left-20' : 'lg:left-64'
  } transition-all duration-300`;

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Settings</h1>
        </div>

        {/* All Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: accentColor }}>{section.icon}</span>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  {section.label}
                </h2>
              </div>
              <SectionContent section={section.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View - Split Layout */}
      <div className={desktopClasses}>
        {/* Left Panel - Navigation */}
        <div className="w-64 flex-shrink-0 h-full border-r border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-[60px] flex items-center px-4 border-b border-secondary-200 dark:border-secondary-800 flex-shrink-0">
            <h1 className="text-xl font-bold text-secondary-900 dark:text-white">Settings</h1>
          </div>

          {/* Section Navigation */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                    }`}
                    style={isActive ? { backgroundColor: accentColor } : undefined}
                  >
                    {section.icon}
                    <span className="flex-1 text-left">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-light-bg dark:bg-secondary-900">
          {/* Header */}
          <div className="h-[60px] flex items-center px-8 border-b border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span style={{ color: accentColor }}>
                {sections.find((s) => s.id === activeSection)?.icon}
              </span>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                {sections.find((s) => s.id === activeSection)?.label}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-xl">
              <SectionContent section={activeSection} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SettingsPage;
