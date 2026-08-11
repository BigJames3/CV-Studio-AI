import { Button } from './button';
import { cn } from '../lib/utils';

export function PaywallBanner({
  title = 'Upgrade to Pro',
  description,
  onUpgrade,
  className,
}: {
  title?: string;
  description?: string;
  onUpgrade?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      role="region"
      aria-label="Upgrade"
    >
      <div>
        <p className="font-semibold">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <Button onClick={onUpgrade}>Upgrade</Button>
    </div>
  );
}
