'use client';

import { Button } from '@/components/ui/button';
import { TemplateGrid } from './components/TemplateGrid';
import { TemplateCustomizer } from './components/TemplateCustomizer';
import { TemplatePreview } from './components/TemplatePreviewPanel';
import { useTemplateSelection } from './hooks/useTemplateSelection';

export default function TemplatesPage() {
  const {
    templates,
    selected,
    selectedId,
    templateKey,
    customization,
    previewData,
    creating,
    selectTemplate,
    patchCustomization,
    createWithTemplate,
  } = useTemplateSelection();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Choose a template</h1>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--cv-text-secondary)]">
            Five professional layouts — customize colors, fonts, and sections, then create your CV.
            Preview updates in real time.
          </p>
        </div>
        <Button size="lg" disabled={creating} onClick={() => void createWithTemplate()}>
          {creating ? 'Creating…' : 'Create with this template'}
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,1fr)_minmax(320px,1.1fr)_280px]">
        <section aria-label="Template gallery">
          <TemplateGrid templates={templates} selectedId={selectedId} onSelect={selectTemplate} />
        </section>

        <section aria-label="Live preview" className="min-h-[480px]">
          <p className="mb-2 text-sm font-medium">
            Preview — <span className="text-primary">{selected.name}</span>
          </p>
          <TemplatePreview templateKey={templateKey} data={previewData} />
        </section>

        {selected.designData ? (
          <TemplateCustomizer
            designData={selected.designData}
            value={customization}
            onChange={patchCustomization}
          />
        ) : null}
      </div>
    </div>
  );
}
