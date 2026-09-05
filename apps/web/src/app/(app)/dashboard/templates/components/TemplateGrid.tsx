'use client';

import type { TemplateListItem } from '@/lib/templates/types';
import { templateAccessType } from '@cvstudio/shared-utils';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { TemplateCard } from './TemplateCard';

export function TemplateGrid({
  templates,
  selectedId,
  onSelect,
}: {
  templates: TemplateListItem[];
  selectedId: string;
  onSelect: (t: TemplateListItem) => void;
}) {
  const { canUseTemplateType, showUpgrade } = useFeatureGate();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((t) => {
        const accessTier = t.accessTier ?? templateAccessType(t.isPremium);
        const hasAccess = canUseTemplateType(accessTier);
        return (
          <TemplateCard
            key={t.id}
            template={t}
            selected={t.id === selectedId}
            locked={!hasAccess}
            lockLabel="Business only"
            onSelect={() => {
              if (!hasAccess) {
                showUpgrade('templates:pro');
                return;
              }
              onSelect(t);
            }}
          />
        );
      })}
    </div>
  );
}
