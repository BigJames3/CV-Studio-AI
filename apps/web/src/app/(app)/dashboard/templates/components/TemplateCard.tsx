'use client';

import type { TemplateListItem } from '@/lib/templates/types';
import { cn } from '@/lib/utils';
import { useFeatureGate } from '@/hooks/useFeatureGate';

export function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateListItem;
  selected?: boolean;
  onSelect: () => void;
}) {
  const { canAccessTemplate, showUpgrade, templateAccessTier } = useFeatureGate();
  const hasAccess = canAccessTemplate(template);
  const lockedTier = templateAccessTier(template);

  return (
    <button
      type="button"
      onClick={() => {
        if (!hasAccess) {
          showUpgrade(lockedTier === 'business' ? 'businessTemplates' : 'proTemplates');
          return;
        }
        onSelect();
      }}
      aria-pressed={selected}
      aria-disabled={!hasAccess}
      data-testid={`template-card-${template.accessTier ?? (template.isPremium ? 'pro' : 'free')}`}
      className={cn(
        'group w-full rounded-xl border bg-surface-card p-3 text-left shadow-1 transition',
        selected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-primary/50',
        !hasAccess && 'cursor-not-allowed opacity-50'
      )}
    >
      <div
        className="mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-[color:var(--cv-color-neutral-100)]"
        style={{
          backgroundImage: `linear-gradient(145deg, ${template.designData?.defaults.primaryColor ?? '#2563eb'}22, transparent 60%)`,
        }}
      >
        <div className="flex h-full flex-col justify-end p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-content-secondary">
            {template.category.replace('_', ' ')}
          </span>
          <span className="text-sm font-semibold">{template.name}</span>
        </div>
      </div>
      <p className="line-clamp-2 text-xs text-content-secondary">{template.description}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-content-secondary">
        <span>★ {template.rating.toFixed(1)}</span>
        {!hasAccess ? (
          <span className="rounded-full bg-secondary/10 px-2 py-0.5 font-semibold text-secondary">
            Business only
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
