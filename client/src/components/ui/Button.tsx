import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal-ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    
    // Size tokens mapping Smart Care paddings
    const sizeClasses = {
      sm: 'text-ease-caption px-ease-14 py-ease-7',
      md: 'text-ease-body-sm px-ease-21 py-ease-14',
      lg: 'text-ease-body px-ease-28 py-ease-21',
    };

    const variantClasses = {
      primary: 'bg-forest-ink text-linen-white hover:bg-opacity-90 active:bg-opacity-80 focus-visible:ring-forest-ink border-none',
      secondary: 'bg-linen-white text-forest-ink border border-hairline-gray hover:bg-mint-veil active:bg-sage-wash focus-visible:ring-forest-ink',
      ghost: 'text-charcoal hover:bg-mint-veil active:bg-sage-wash focus-visible:ring-forest-ink',
      danger: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 focus-visible:ring-danger-500',
      'teal-ghost': 'text-forest-ink hover:bg-mint-veil active:bg-sage-wash focus-visible:ring-forest-ink',
    };

    const baseClasses = 'inline-flex items-center justify-center gap-2 font-normal rounded-buttons transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none whitespace-nowrap shadow-none';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          isLoading && 'opacity-80 cursor-wait',
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
