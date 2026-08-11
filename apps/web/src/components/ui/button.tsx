import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 min-h-10',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-hover shadow-1',
        primary: 'bg-primary text-white hover:bg-primary-hover shadow-1',
        secondary: 'bg-secondary-subtle text-secondary border border-secondary/20',
        outline:
          'border border-border bg-transparent text-[color:var(--cv-text-primary)] hover:bg-[color:var(--cv-color-neutral-100)] dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800',
        ghost: 'hover:bg-[color:var(--cv-color-neutral-100)] text-[color:var(--cv-text-secondary)]',
        destructive: 'bg-error text-white',
        link: 'text-primary underline-offset-4 hover:underline h-auto min-h-0 px-0',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-5 text-base font-semibold',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';
