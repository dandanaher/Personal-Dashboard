import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full min-h-touch px-4 py-3 text-base
            bg-white dark:bg-secondary-800
            border rounded-lg
            text-secondary-900 dark:text-white
            placeholder-secondary-400 dark:placeholder-secondary-500
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            touch-manipulation
            ${
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-secondary-300 dark:border-secondary-600 focus:ring-primary-500 focus:border-primary-500'
            }
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-secondary-500 dark:text-secondary-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
