import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', padding = 'md', children, ...props }, ref) => {
    // Use Tailwind class which is mapped to CSS variable in tailwind.config.js
    const baseStyles = 'rounded-3xl transition-shadow duration-200';

    const variantStyles = {
      default: 'bg-white dark:bg-secondary-800 shadow-sm',
      elevated: 'bg-white dark:bg-secondary-800 shadow-md hover:shadow-lg',
      outlined:
        'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
