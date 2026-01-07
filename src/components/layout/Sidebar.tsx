/**
 * Sidebar - DESKTOP ONLY navigation component
 *
 * Visibility: `hidden lg:flex` - hidden below 1024px, flex on desktop
 *
 * Features:
 * - Collapsible (toggle via chevron button)
 * - Shows app logo, navigation links, resume workout button, and settings
 * - Fixed to left side of screen on desktop
 *
 * Mobile equivalent: BottomNav.tsx
 */
import { useMemo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, Target, Grid, Dumbbell, Home, ChevronLeft, StickyNote, Settings } from 'lucide-react';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { useThemeStore } from '@/stores/themeStore';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { formatTime } from '@/features/workout/lib/workoutEngine';
import { preloadRoute } from '@/lib/preloadRoute';
import { DynamicLogo } from '@/components/ui/DynamicLogo';

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

function Sidebar() {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { isCollapsed, toggleSidebar } = useStoreWithEqualityFn(
    useSidebarStore,
    (state) => ({
      isCollapsed: state.isCollapsed,
      toggleSidebar: state.toggleSidebar,
    }),
    shallow
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { showResume, resumeLabel, elapsedSeconds, resumeWorkout } = useStoreWithEqualityFn(
    useWorkoutSessionStore,
    (state) => {
      const shouldShow = state.isActive && state.isMinimized && !!state.activeTemplate;
      return {
        showResume: shouldShow,
        resumeLabel: shouldShow ? state.activeTemplate?.name || 'Workout' : null,
        elapsedSeconds: shouldShow ? state.elapsedSeconds : 0,
        resumeWorkout: state.resumeWorkout,
      };
    },
    shallow
  );

  const activeIndex = useMemo(() => {
    return navItems.findIndex((item) => location.pathname.startsWith(item.path));
  }, [location.pathname]);

  const handleResume = useCallback(() => {
    resumeWorkout();
    navigate('/workout');
  }, [resumeWorkout, navigate]);

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 flex-shrink-0 z-50 bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-800 transition-[width] duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Logo/Brand and Toggle */}
      <div
        className="h-[60px] border-b border-secondary-200 dark:border-secondary-800 flex items-center justify-between pl-6 pr-4"
      >
        <button
          onClick={isCollapsed ? toggleSidebar : undefined}
          className={`flex items-center gap-3 ${isCollapsed ? 'cursor-pointer' : 'cursor-default'}`}
          aria-label={isCollapsed ? 'Expand sidebar' : undefined}
        >
          <DynamicLogo size={32} />
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-secondary-900 dark:text-white">
              MyDash
            </h1>
          )}
        </button>
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors text-secondary-600 dark:text-secondary-400 flex-shrink-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-5 w-5 flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActiveItem = index === activeIndex;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onMouseEnter={() => preloadRoute(item.path)}
                  onFocus={() => preloadRoute(item.path)}
                  className={`
                    flex items-center rounded-xl transition-colors py-3
                    ${isActiveItem
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
            className={`w-full py-3 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-sm text-sm font-medium flex items-center gap-2 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-all ${isCollapsed ? 'px-3 justify-center' : 'px-4 justify-center'
              }`}
            title={isCollapsed && resumeLabel ? `Resume: ${resumeLabel}` : undefined}
          >
            <Dumbbell className="h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
            {!isCollapsed && (
              <>
                <span className="truncate">Resume: {resumeLabel || 'Workout'}</span>
                <span className="text-secondary-500 flex-shrink-0">
                  ({formatTime(elapsedSeconds)})
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Settings at bottom */}
      <div className="p-4 border-t border-secondary-200 dark:border-secondary-800 mt-auto">
        <NavLink
          to="/settings"
          onMouseEnter={() => preloadRoute('/settings')}
          onFocus={() => preloadRoute('/settings')}
          className={`
            flex items-center rounded-xl transition-colors py-3
            ${location.pathname === '/settings'
              ? 'font-medium'
              : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }
          `}
          style={{
            paddingLeft: '14px',
            paddingRight: '16px',
            ...(location.pathname === '/settings' && {
              backgroundColor: `${accentColor}15`,
              color: accentColor,
            }),
          }}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <div className="flex items-center justify-center w-5 flex-shrink-0">
            <Settings className="h-5 w-5 flex-shrink-0" />
          </div>
          <span
            className="whitespace-nowrap overflow-hidden transition-opacity duration-300 ml-3"
            style={{
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto',
            }}
          >
            Settings
          </span>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
