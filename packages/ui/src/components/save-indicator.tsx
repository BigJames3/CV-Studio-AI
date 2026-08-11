import { cn } from '../lib/utils';
import { Check, Loader2, AlertCircle } from 'lucide-react';

export type SaveStatus = 'saved' | 'saving' | 'pending' | 'error';

const copy: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  pending: 'Unsaved changes',
  error: 'Save failed',
};

/** Editor autosave indicator — live region for SR. */
export function SaveIndicator({ status, className }: { status: SaveStatus; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
      aria-live="polite"
      role="status"
    >
      {status === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {status === 'saved' ? (
        <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" aria-hidden />
      ) : null}
      {status === 'error' ? (
        <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />
      ) : null}
      {copy[status]}
    </span>
  );
}
