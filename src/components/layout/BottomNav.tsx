import { NavLink, useLocation } from 'react-router-dom';
import { CheckSquare, Target, Grid, Dumbbell, Home } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    path: '/home',
    label: 'Home',
    icon: <Home className="h-5 w-5" />,
  },
  {
    path: '/tasks',
    label: 'Tasks',
    icon: <CheckSquare className="h-5 w-5" />,
  },
  {
    path: '/goals',
    label: 'Goals',
    icon: <Target className="h-5 w-5" />,
  },
  {
    path: '/habits',
    label: 'Habits',
    icon: <Grid className="h-5 w-5" />,
  },
  {
    path: '/workout',
    label: 'Workout',
    icon: <Dumbbell className="h-5 w-5" />,
  },
];

function BottomNav() {
  const { accentColor } = useThemeStore();
  const location = useLocation();

  // Find the active index
  const activeIndex = navItems.findIndex(item => location.pathname.startsWith(item.path));
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;

  // Circle size matches the nav bar height minus padding
  const circleSize = 48; // pixels

  return (
    <nav className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none" style={{ bottom: 'max(4px, env(safe-area-inset-bottom))' }}>
      <div
        className="relative bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 shadow-lg shadow-black/5 pointer-events-auto"
        style={{ borderRadius: `${(circleSize + 8) / 2}px` }}
      >
        {/* Animated circle indicator */}
        <div
          className="absolute top-1 transition-all duration-300 ease-out pointer-events-none"
          style={{
            left: `${4 + safeActiveIndex * circleSize}px`,
            width: `${circleSize}px`,
            height: `${circleSize}px`,
          }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: `${accentColor}20`,
            }}
          />
        </div>

        {/* Navigation items */}
        <div className="relative flex items-center p-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center justify-center rounded-full transition-colors duration-200 touch-manipulation ${
                index === safeActiveIndex
                  ? ''
                  : 'text-secondary-500 dark:text-secondary-400'
              }`}
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
                ...(index === safeActiveIndex ? { color: accentColor } : {}),
              }}
            >
              {item.icon}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default BottomNav;
