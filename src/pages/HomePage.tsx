import { Link } from 'react-router-dom';
import { CheckSquare, Target, Grid, Dumbbell, User, Palette, LogOut, Check, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, APP_COLORS } from '@/stores/themeStore';

interface NavCardProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  accentColor: string;
}

function NavCard({ to, icon, label, description, accentColor }: NavCardProps) {
  return (
    <Link
      to={to}
      className="block p-4 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:shadow-md transition-all duration-200 touch-manipulation"
    >
      <div className="flex items-center gap-3">
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <div style={{ color: accentColor }}>{icon}</div>
        </div>
        <div>
          <h3 className="font-semibold text-secondary-900 dark:text-white">{label}</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function HomePage() {
  const { user, signOut } = useAuthStore();
  const { accentColor, setAccentColor, darkMode, toggleDarkMode } = useThemeStore();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const navItems = [
    {
      to: '/tasks',
      icon: <CheckSquare className="h-6 w-6" />,
      label: 'Tasks',
      description: 'Manage your daily tasks',
    },
    {
      to: '/goals',
      icon: <Target className="h-6 w-6" />,
      label: 'Goals',
      description: 'Track your long-term goals',
    },
    {
      to: '/habits',
      icon: <Grid className="h-6 w-6" />,
      label: 'Habits',
      description: 'Build consistent habits',
    },
    {
      to: '/workout',
      icon: <Dumbbell className="h-6 w-6" />,
      label: 'Workout',
      description: 'Log your workouts',
    },
  ];

  return (
    <div className="min-h-full pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-secondary-500 dark:text-secondary-400">
            What would you like to work on today?
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="space-y-3 mb-8">
          {navItems.map((item) => (
            <NavCard
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              description={item.description}
              accentColor={accentColor}
            />
          ))}
        </div>

        {/* Profile Section */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-secondary-500" />
              <h2 className="font-semibold text-secondary-900 dark:text-white">Profile</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Email</p>
                <p className="text-secondary-900 dark:text-white">{user?.email || 'Not signed in'}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center w-10 h-10 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Customization Section */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-secondary-500" />
              <h2 className="font-semibold text-secondary-900 dark:text-white">Customization</h2>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {/* Theme Toggle */}
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-3">
                Theme
              </p>
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-3 w-full p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
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
                <span className="text-sm text-secondary-700 dark:text-secondary-300">
                  {darkMode ? 'Dark mode' : 'Light mode'}
                </span>
              </button>
            </div>

            {/* Accent Color */}
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-3">
                Accent color
              </p>
              <div className="grid grid-cols-5 gap-3">
              {APP_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`
                    relative w-10 h-10 rounded-full border-2 transition-all duration-150
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
                  aria-pressed={accentColor === color.value}
                >
                  {accentColor === color.value && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white drop-shadow-md" />
                    </span>
                  )}
                </button>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
