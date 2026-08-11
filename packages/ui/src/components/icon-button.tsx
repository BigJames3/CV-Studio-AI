import * as React from 'react';
import { cn } from '../lib/utils';
import { Button, type ButtonProps } from './button';

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  'aria-label': string;
  children: React.ReactNode;
}

/** Icon-only button — aria-label is required. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} size="icon" className={cn(className)} {...props} />
  )
);
IconButton.displayName = 'IconButton';
