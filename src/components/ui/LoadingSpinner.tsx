import { useThemeStore } from '@/stores/themeStore';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const { stylePreset, accentColor } = useThemeStore();

  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  // Retro Style Rendering - uses square border spinner with accent color
  if (stylePreset === 'retro') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className={`${sizeStyles[size]} border-2 border-t-transparent animate-spin`}
          style={{ borderColor: `${accentColor} transparent transparent transparent` }}
        />
      </div>
    );
  }

  // Modern (Default) Style Rendering
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className={`animate-spin text-primary-500 ${sizeStyles[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export default LoadingSpinner;
