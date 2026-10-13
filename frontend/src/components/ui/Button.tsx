import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const prefersReduced = useReducedMotion();
    const ok = !prefersReduced;
    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileTap={{ scale: ok ? 0.96 : 1 }}
        whileHover={{ scale: ok && variant === 'primary' ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
