import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'hover';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    
    const variantClasses = {
      default: 'bg-linen-white border border-hairline-gray shadow-none',
      glass: 'border-white/20 backdrop-blur-md bg-white/80 shadow-none',
      hover: 'bg-linen-white border border-hairline-gray shadow-none transition-colors duration-200 hover:bg-mint-veil cursor-pointer',
    };

    const paddingClasses = {
      none: 'p-0',
      sm: 'p-ease-14',
      md: 'p-ease-21',
      lg: 'p-ease-28',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-cards overflow-hidden',
          variantClasses[variant],
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export { Card };
