import { HTMLAttributes, forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
  animate?: boolean;
}

const cardClass = (padding: boolean, className?: string) =>
  cn(
    'bg-white rounded-xl border border-gray-200 shadow-card w-full',
    padding && 'p-6',
    className
  );

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = true, animate = true, children, ...props }, ref) => {
    const prefersReduced = useReducedMotion();
    const shouldAnimate = animate && !prefersReduced;

    if (shouldAnimate) {
      return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={cardClass(padding, className)}
          {...(props as any)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={cardClass(padding, className)} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-base font-semibold text-gray-900', className)} {...props}>
    {children}
  </h3>
);
