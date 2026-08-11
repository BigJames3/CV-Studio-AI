'use client';

import { Suspense, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { EditorShell } from '@/components/editor/editor-shell';
import { useCv } from '@/hooks';
import { useEditorStore } from '@/stores/editor-store';
import { normalizeCvContent } from '@/lib/templates/normalize-content';
import type { TemplateKey } from '@/lib/templates/types';

function EditorPageInner() {
  const params = useParams<{ resumeId: string }>();
  const resumeId = params.resumeId;
  const isLocal = resumeId.startsWith('local-');
  const { data, isLoading, isError } = useCv(resumeId);
  const hydrate = useEditorStore((s) => s.hydrate);

  useEffect(() => {
    if (isLocal || !data) return;
    const raw = (data as { content?: unknown }).content;
    const content = normalizeCvContent(raw);
    const templateKey = (content.templateKey ?? 'modern') as TemplateKey;
    hydrate(resumeId, content, templateKey);
  }, [data, hydrate, resumeId, isLocal]);

  if (!isLocal && isLoading) {
    return <div className="p-8 text-sm">Chargement de l’éditeur…</div>;
  }
  if (!isLocal && isError) {
    return <div className="p-8 text-sm text-error">CV introuvable ou non autorisé.</div>;
  }

  return <EditorShell resumeId={resumeId} />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Chargement…</div>}>
      <EditorPageInner />
    </Suspense>
  );
}
