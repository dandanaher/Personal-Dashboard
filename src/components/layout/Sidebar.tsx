import { memo, useMemo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, Target, Grid, Dumbbell, Home, ChevronLeft, ChevronRight, StickyNote } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { useSidebarStore } from '@/stores/sidebarStore';
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
    icon: <Home className="h-5 w-5 flex-shrink-0" />,
  },
  {
    path: '/tasks',
    label: 'Tasks',
    icon: <CheckSquare className="h-5 w-5 flex-shrink-0" />,
  },
  {
    path: '/goals',
    label: 'Goals',
    icon: <Target className="h-5 w-5 flex-shrink-0" />,
  },
  {
    path: '/habits',
    label: 'Habits',
    icon: <Grid className="h-5 w-5 flex-shrink-0" />,
  },
  {
    path: '/workout',
    label: 'Workout',
    icon: <Dumbbell className="h-5 w-5 flex-shrink-0" />,
  },
  {
    path: '/notes',
    label: 'Notes',
    icon: <StickyNote className="h-5 w-5 flex-shrink-0" />,
  },
];

const Sidebar = memo(function Sidebar() {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive, isMinimized, activeTemplate, elapsedSeconds, resumeWorkout } =
    useWorkoutSessionStore();

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
    <aside
      className={`hidden lg:flex flex-col min-h-screen bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-800 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo/Brand and Toggle */}
      <div
        className="border-b border-secondary-200 dark:border-secondary-800 flex items-center transition-all duration-300 py-4"
        style={{
          paddingLeft: '14px',
          paddingRight: '16px',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        {!isCollapsed && (
          <h1
            className="text-xl font-bold text-secondary-900 dark:text-white transition-opacity duration-300"
            style={{ paddingLeft: '14px' }}
          >
            MyDash
          </h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors text-secondary-600 dark:text-secondary-400 flex-shrink-0"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 flex-shrink-0" />
          ) : (
            <ChevronLeft className="h-5 w-5 flex-shrink-0" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActiveItem = index === safeActiveIndex;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onMouseEnter={() => preloadRoute(item.path)}
                  onFocus={() => preloadRoute(item.path)}
                  className={`
                    flex items-center rounded-xl transition-colors py-3
                    ${
                      isActiveItem
                        ? 'font-medium'
                        : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                    }
                  `}
                  style={{
                    paddingLeft: '14px',
                    paddingRight: '16px',
                    ...(isActiveItem && {
                      backgroundColor: `${accentColor}15`,
                      color: accentColor,
                    }),
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center justify-center w-5 flex-shrink-0">
                    {item.icon}
                  </div>
                  <span
                    className="whitespace-nowrap overflow-hidden transition-opacity duration-300 ml-3"
                    style={{
                      opacity: isCollapsed ? 0 : 1,
                      width: isCollapsed ? 0 : 'auto',
                    }}
                  >
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Resume Workout Button */}
      {showResume && (
        <div className="p-4 border-t border-secondary-200 dark:border-secondary-800">
          <button
            onClick={handleResume}
            className={`w-full py-3 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-sm text-sm font-medium flex items-center gap-2 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-all ${
              isCollapsed ? 'px-3 justify-center' : 'px-4 justify-center'
            }`}
            title={isCollapsed ? `Resume: ${activeTemplate?.name || 'Workout'}` : undefined}
          >
            <Dumbbell className="h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
            {!isCollapsed && (
              <>
                <span className="truncate">Resume: {activeTemplate?.name || 'Workout'}</span>
                <span className="text-secondary-500 flex-shrink-0">
                  ({formatTime(elapsedSeconds)})
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
});

export default Sidebar;
