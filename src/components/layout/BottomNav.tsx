import { memo, useMemo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, Target, Grid, Dumbbell, Home } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { formatTime } from '@/features/workout/lib/workoutEngine';
import { preloadRoute } from '@/App';

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

// Circle size for nav items
const CIRCLE_SIZE = 48;

const BottomNav = memo(function BottomNav() {
  const accentColor = useThemeStore((state) => state.accentColor);
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive, isMinimized, activeTemplate, elapsedSeconds, resumeWorkout } =
    useWorkoutSessionStore();

  // Find the active index - memoized
  const safeActiveIndex = useMemo(() => {
    const activeIndex = navItems.findIndex((item) => location.pathname.startsWith(item.path));
    return activeIndex === -1 ? 0 : activeIndex;
  }, [location.pathname]);

  const showResume = isActive && isMinimized && !!activeTemplate;

  const handleResume = useCallback(() => {
    resumeWorkout();
    navigate('/workout');
  }, [resumeWorkout, navigate]);

  return (
    <nav
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ bottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative w-full flex justify-center">
        {showResume && (
          <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-auto">
            <button
              onClick={handleResume}
              className="px-4 py-2 rounded-full bg-white text-secondary-900 border border-secondary-200 dark:bg-secondary-800 dark:text-secondary-100 dark:border-secondary-700 shadow-lg shadow-black/10 text-sm font-medium flex items-center gap-2"
            >
              Resume: {activeTemplate?.name || 'Workout'} ({formatTime(elapsedSeconds)})
            </button>
          </div>
        )}

        <div
          className="relative bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 shadow-lg shadow-black/5 pointer-events-auto"
          style={{ borderRadius: 'var(--radius-full)' }}
        >
          {/* Animated circle indicator - using transform for GPU acceleration */}
          <div
            className="absolute top-1 pointer-events-none will-change-transform"
            style={{
              transform: `translateX(${4 + safeActiveIndex * CIRCLE_SIZE}px)`,
              width: `${CIRCLE_SIZE}px`,
              height: `${CIRCLE_SIZE}px`,
              borderRadius: 'var(--radius-full)',
              transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              className="w-full h-full"
              style={{
                backgroundColor: `${accentColor}20`,
                borderRadius: 'var(--radius-full)',
              }}
            />
          </div>

          {/* Navigation items */}
          <div className="relative flex items-center p-1">
            {navItems.map((item, index) => (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => preloadRoute(item.path)}
                onFocus={() => preloadRoute(item.path)}
                className={`flex items-center justify-center touch-manipulation ${
                  index === safeActiveIndex ? '' : 'text-secondary-500 dark:text-secondary-400'
                }`}
                style={{
                  width: `${CIRCLE_SIZE}px`,
                  height: `${CIRCLE_SIZE}px`,
                  borderRadius: 'var(--radius-full)',
                  transition: 'color 150ms',
                  ...(index === safeActiveIndex ? { color: accentColor } : {}),
                }}
              >
                {item.icon}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
});

export default BottomNav;
