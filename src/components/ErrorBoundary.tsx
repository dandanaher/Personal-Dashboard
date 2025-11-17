import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Card } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-secondary-50 dark:bg-secondary-900">
          <Card variant="elevated" padding="lg" className="text-center max-w-sm w-full">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mb-4">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <div className="mb-4 p-3 bg-secondary-100 dark:bg-secondary-800 rounded-lg text-left">
                <p className="text-xs font-mono text-secondary-600 dark:text-secondary-400 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
