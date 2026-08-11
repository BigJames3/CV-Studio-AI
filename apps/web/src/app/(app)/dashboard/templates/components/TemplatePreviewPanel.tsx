'use client';

import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import type { CvContent, TemplateKey } from '@/lib/templates/types';

export function TemplatePreview({
  templateKey,
  data,
  zoom = 0.55,
}: {
  templateKey: TemplateKey;
  data: CvContent;
  zoom?: number;
}) {
  return (
    <div className="overflow-auto rounded-xl border border-border bg-[color:var(--cv-color-neutral-100)] p-4 dark:bg-[color:var(--cv-color-neutral-900)]">
      <div
        className="mx-auto origin-top"
        style={{
          width: '210mm',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          marginBottom: `${(1 - zoom) * -297}mm`,
        }}
      >
        <TemplateWrapper templateKey={templateKey} data={data} />
      </div>
    </div>
  );
}
