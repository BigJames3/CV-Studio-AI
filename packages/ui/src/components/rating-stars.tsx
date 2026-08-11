import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

export function RatingStars({
  value,
  max = 5,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${value} out of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3.5 w-3.5',
            i < Math.round(value)
              ? 'fill-[hsl(var(--warning))] text-[hsl(var(--warning))]'
              : 'text-muted-foreground'
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}
