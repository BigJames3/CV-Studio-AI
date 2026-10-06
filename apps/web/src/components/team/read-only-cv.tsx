'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import type { CvContent, TemplateKey } from '@/lib/templates/types';

/** What a team viewer sees: the rendered CV, no form and no autosave. */
export function ReadOnlyCv({
  title,
  content,
  templateKey,
}: {
  title: string;
  content: CvContent;
  templateKey: TemplateKey;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6" data-testid="cv-read-only">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-content-secondary">Partagé par votre équipe · lecture seule</p>
        </div>
        <Link href="/dashboard">
          <Button size="sm" variant="outline">
            Retour au dashboard
          </Button>
        </Link>
      </div>
      <div className="overflow-auto rounded-lg bg-[color:var(--cv-color-neutral-100)] p-6">
        <div className="mx-auto w-fit">
          <TemplateWrapper templateKey={templateKey} data={content} />
        </div>
      </div>
    </div>
  );
}
