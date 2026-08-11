import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <Loader2
      className={cn('h-5 w-5 animate-spin text-muted-foreground', className)}
      role="status"
      aria-label={label}
    />
  );
}
