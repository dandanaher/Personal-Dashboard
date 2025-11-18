import { NavLink } from 'react-router-dom';
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-lg border-t border-secondary-200 dark:border-secondary-700 pb-safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-touch px-2 py-1 rounded-lg transition-colors duration-200 touch-manipulation ${
                isActive
                  ? ''
                  : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
              }`
            }
            style={({ isActive }) => isActive ? { color: accentColor } : {}}
          >
            {item.icon}
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
