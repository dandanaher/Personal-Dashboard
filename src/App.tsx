import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { AppShell } from '@/components/layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui';
import { logger } from '@/lib/logger';

// Pages (loaded eagerly for fast initial load)
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Feature pages (lazy loaded for code splitting)
const HomePage = lazy(() => import('@/pages/HomePage'));
const TasksPage = lazy(() => import('@/features/todos/TasksPage'));
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage'));
const HabitsPage = lazy(() => import('@/features/habits/HabitsPage'));
const WorkoutPage = lazy(() => import('@/features/workout/WorkoutPage'));
const NotesPage = lazy(() => import('@/features/notes/NotesPage'));

// Route preloading map for instant navigation
const routePreloaders: Record<string, () => void> = {
  '/home': () => void import('@/pages/HomePage'),
  '/tasks': () => void import('@/features/todos/TasksPage'),
  '/goals': () => void import('@/features/goals/GoalsPage'),
  '/habits': () => void import('@/features/habits/HabitsPage'),
  '/workout': () => void import('@/features/workout/WorkoutPage'),
  '/notes': () => void import('@/features/notes/NotesPage'),
};

// Preload route on hover/focus for instant navigation
export function preloadRoute(path: string) {
  const preloader = routePreloaders[path];
  if (preloader) preloader();
}

// Loading fallback for lazy routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="md" />
    </div>
  );
}

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuthStore();

  logger.log('ProtectedRoute: loading =', loading, ', user =', user?.email || 'none');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-secondary-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    logger.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { loading, error, initialize, user } = useAuthStore();
  const { accentColor } = useThemeStore();

  logger.log('App: Render - loading =', loading, ', user =', user?.email || 'none', ', error =', error);

  useEffect(() => {
    logger.log('App: useEffect - calling initialize()');
    initialize().catch((err) => {
      logger.error('App: Initialize failed:', err);
    });
  }, [initialize]);

  // Initialize theme color CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
  }, [accentColor]);

  // Show loading screen while initializing auth
  if (loading) {
    logger.log('App: Showing loading screen');
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: accentColor }}
      >
        <h1 className="text-4xl font-bold text-white mb-4">MyDash</h1>
        <LoadingSpinner size="md" className="[&_svg]:text-white" />
        <p className="mt-4 text-sm text-white/70">Loading...</p>
        {error && (
          <div className="mt-4 text-center">
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-white rounded-full text-sm font-medium"
              style={{ color: accentColor }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  logger.log('App: Rendering main app');

  return (
    <ErrorBoundary>
      <BrowserRouter
        basename={import.meta.env.BASE_URL.replace(/\/$/, '')}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes with AppShell layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/workout" element={<WorkoutPage />} />
              <Route path="/notes" element={<NotesPage />} />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
