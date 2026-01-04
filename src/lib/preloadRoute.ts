const routePreloaders: Record<string, () => void> = {
  '/home': () => void import('@/pages/HomePage'),
  '/tasks': () => void import('@/features/todos/TasksPage'),
  '/goals': () => void import('@/features/goals/GoalsPage'),
  '/habits': () => void import('@/features/habits/HabitsPage'),
  '/workout': () => void import('@/features/workout/WorkoutPage'),
  '/notes': () => void import('@/features/notes/NotesPage'),
};

export function preloadRoute(path: string) {
  const preloader = routePreloaders[path];
  if (preloader) preloader();
}
