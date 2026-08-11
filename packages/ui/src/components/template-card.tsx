import { cn } from '../lib/utils';
import { Badge } from './badge';
import { RatingStars } from './rating-stars';

export function TemplateCard({
  title,
  price,
  rating,
  premium,
  className,
  onClick,
}: {
  title: string;
  price?: string;
  rating?: number;
  premium?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full rounded-xl border bg-card text-left shadow-sm transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <div className="aspect-[3/4] rounded-t-xl bg-muted" />
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{title}</p>
          {premium ? <Badge variant="secondary">Pro</Badge> : null}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {price ? <span>{price}</span> : <span>Free</span>}
          {typeof rating === 'number' ? <RatingStars value={rating} /> : null}
        </div>
      </div>
    </button>
  );
}
