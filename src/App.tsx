import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/components/layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui';

// Pages
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Feature pages
import TasksPage from '@/features/todos/TasksPage';
import GoalsPage from '@/features/goals/GoalsPage';
import HabitsPage from '@/features/habits/HabitsPage';
import WorkoutPage from '@/features/workout/WorkoutPage';

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuthStore();

  console.log('ProtectedRoute: loading =', loading, ', user =', user?.email || 'none');

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
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { loading, error, initialize, user } = useAuthStore();

  console.log('App: Render - loading =', loading, ', user =', user?.email || 'none', ', error =', error);

  useEffect(() => {
    console.log('App: useEffect - calling initialize()');
    initialize().catch((err) => {
      console.error('App: Initialize failed:', err);
    });
  }, [initialize]);

  // Show loading screen while initializing auth
  if (loading) {
    console.log('App: Showing loading screen');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary-500">
        <h1 className="text-4xl font-bold text-white mb-4">MyDash</h1>
        <LoadingSpinner size="md" className="[&_svg]:text-white" />
        <p className="mt-4 text-sm text-primary-100">Loading: {loading.toString()}</p>
        <p className="text-xs text-primary-200">Check console for details</p>
        {error && (
          <div className="mt-4 text-center">
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-white text-primary-500 rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  console.log('App: Rendering main app');

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
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
            <Route index element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/workout" element={<WorkoutPage />} />
          </Route>

          {/* 404 route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
