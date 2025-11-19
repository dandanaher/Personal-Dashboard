import { ButtonHTMLAttributes, forwardRef } from 'react';
import { useThemeStore } from '@/stores/themeStore';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { accentColor } = useThemeStore();

    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation select-none';

    const variantStyles = {
      primary:
        'text-white disabled:opacity-50',
      secondary:
        'bg-secondary-200 text-secondary-900 hover:bg-secondary-300 focus:ring-secondary-500 dark:bg-secondary-700 dark:text-white dark:hover:bg-secondary-600',
      outline:
        'border-2 hover:bg-opacity-10 dark:hover:bg-opacity-20',
      ghost:
        'text-secondary-600 hover:bg-secondary-100 focus:ring-secondary-500 dark:text-secondary-400 dark:hover:bg-secondary-800',
    };

    const sizeStyles = {
      sm: 'min-h-[36px] min-w-[36px] px-3 py-1.5 text-sm',
      md: 'min-h-touch min-w-touch px-4 py-2 text-base',
      lg: 'min-h-[52px] min-w-[52px] px-6 py-3 text-lg',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    // Dynamic styles for primary and outline variants
    const dynamicStyle: React.CSSProperties = {
      ...style,
    };

    if (variant === 'primary') {
      dynamicStyle.backgroundColor = disabled || isLoading ? undefined : accentColor;
      dynamicStyle.boxShadow = `0 0 0 2px ${accentColor}`;
      if (disabled || isLoading) {
        dynamicStyle.backgroundColor = `${accentColor}80`;
      }
    } else if (variant === 'outline') {
      dynamicStyle.borderColor = accentColor;
      dynamicStyle.color = accentColor;
      dynamicStyle.boxShadow = `0 0 0 2px ${accentColor}`;
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        disabled={disabled || isLoading}
        style={dynamicStyle}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
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
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
