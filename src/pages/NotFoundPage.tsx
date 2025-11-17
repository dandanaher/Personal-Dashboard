import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/components/ui';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-secondary-50 dark:bg-secondary-900">
      <Card variant="elevated" padding="lg" className="text-center max-w-sm w-full">
        <div className="text-6xl font-bold text-primary-500 mb-4">404</div>
        <h1 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
          Page Not Found
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => navigate('/tasks')} className="gap-2">
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default NotFoundPage;
