import { NavLink } from 'react-router-dom';
import { CheckSquare, Target, Grid, Dumbbell } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    path: '/tasks',
    label: 'Tasks',
    icon: <CheckSquare className="h-6 w-6" />,
  },
  {
    path: '/goals',
    label: 'Goals',
    icon: <Target className="h-6 w-6" />,
  },
  {
    path: '/habits',
    label: 'Habits',
    icon: <Grid className="h-6 w-6" />,
  },
  {
    path: '/workout',
    label: 'Workout',
    icon: <Dumbbell className="h-6 w-6" />,
  },
];

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-lg border-t border-secondary-200 dark:border-secondary-700 pb-safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-touch min-h-touch px-3 py-2 rounded-lg transition-colors duration-200 touch-manipulation ${
                isActive
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
              }`
            }
          >
            {item.icon}
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
