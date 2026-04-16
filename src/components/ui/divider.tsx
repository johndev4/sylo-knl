import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const Divider = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('my-1 h-px bg-border dark:bg-border/60', className)}
    role="separator"
    {...props}
  />
));

Divider.displayName = 'Divider';

export { Divider };
