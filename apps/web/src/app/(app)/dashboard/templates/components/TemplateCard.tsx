'use client';

import type { TemplateListItem } from '@/lib/templates/types';
import { cn } from '@/lib/utils';
import { templateKeyOf } from '@/lib/templates/catalog';
import { TemplateThumbnail } from '@/components/templates/TemplateThumbnail';

export function TemplateCard({
  template,
  selected,
  onSelect,
  locked = false,
  lockLabel = 'Pro',
}: {
  template: TemplateListItem;
  selected?: boolean;
  onSelect: () => void;
  locked?: boolean;
  lockLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-disabled={locked}
      className={cn(
        'group w-full rounded-xl border bg-surface-card p-3 text-left shadow-1 transition',
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-primary/50',
        locked && 'cursor-not-allowed opacity-50'
      )}
    >
      <div className="mb-3 aspect-[210/297] overflow-hidden rounded-lg border border-border bg-white">
        <TemplateThumbnail templateKey={templateKeyOf(template)} />
      </div>
      <p className="text-sm font-semibold">{template.name}</p>
      <p className="line-clamp-2 text-xs text-content-secondary">{template.description}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-content-secondary">
        {template.rating > 0 ? <span>★ {template.rating.toFixed(1)}</span> : <span>Nouveau</span>}
        {locked ? (
          <span className="rounded-full bg-secondary/10 px-2 py-0.5 font-semibold text-secondary">
            🔒 {lockLabel}
          </span>
        ) : template.isPremium ? (
          <span className="rounded-full bg-secondary/10 px-2 py-0.5 font-semibold text-secondary">
            Pro
          </span>
        ) : (
          <span>Free</span>
        )}
      </div>
    </button>
  );
}
