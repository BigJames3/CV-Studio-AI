'use client';

import type { TemplateListItem } from '@/lib/templates/types';
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
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          selected={t.id === selectedId}
          onSelect={() => onSelect(t)}
        />
      ))}
    </div>
  );
}
