'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditorStore, emptyContent, type SectionId } from '@/stores/editor-store';
import { useAutosave, useDebouncedValue } from '@/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TemplateWrapper } from '@/components/templates/TemplateWrapper';
import { ExportPDFButton } from '@/components/cv-editor/ExportPDFButton';
import { AtsPanel } from '@/components/editor/ats-panel';
import type { TemplateKey } from '@/lib/templates/types';
import { TEMPLATE_DESIGN_DATA } from '@/lib/templates/catalog';
import { SAMPLE_CV } from '@/lib/templates/sample-cv';
import {
  CertificatesForm,
  EducationForm,
  ExperienceForm,
  IdentityForm,
  LanguagesForm,
  ProjectsForm,
  ReferencesForm,
  SkillsForm,
  SummaryForm,
} from '@/components/editor/section-forms';
import '@/styles/print.css';

const SECTIONS: { id: SectionId; label: string; short: string }[] = [
  { id: 'identity', label: 'Profil', short: 'Pro' },
  { id: 'summary', label: 'Résumé', short: 'Rés' },
  { id: 'experience', label: 'Expérience', short: 'Exp' },
  { id: 'education', label: 'Formation', short: 'For' },
  { id: 'skills', label: 'Skills', short: 'Ski' },
  { id: 'languages', label: 'Langues', short: 'Lan' },
  { id: 'projects', label: 'Projets', short: 'Prj' },
  { id: 'certificates', label: 'Certificats', short: 'Cer' },
  { id: 'references', label: 'Références', short: 'Réf' },
];

function ActiveSectionForm({ section }: { section: SectionId }) {
  switch (section) {
    case 'identity':
      return <IdentityForm />;
    case 'summary':
      return <SummaryForm />;
    case 'experience':
      return <ExperienceForm />;
    case 'education':
      return <EducationForm />;
    case 'skills':
      return <SkillsForm />;
    case 'languages':
      return <LanguagesForm />;
    case 'projects':
      return <ProjectsForm />;
    case 'certificates':
      return <CertificatesForm />;
    case 'references':
      return <ReferencesForm />;
    default:
      return null;
  }
}

export function EditorShell({ resumeId }: { resumeId: string }) {
  const searchParams = useSearchParams();
  const {
    content,
    templateKey,
    activeSection,
    saveStatus,
    previewZoom,
    mobileTab,
    drawer,
    hydrate,
    setActiveSection,
    setMobileTab,
    setZoom,
    setDrawer,
    setTemplateKey,
    patchCustomization,
  } = useEditorStore();

  useEffect(() => {
    if (!resumeId.startsWith('local-')) return;

    const fromQuery = searchParams.get('template') as TemplateKey | null;
    let key: TemplateKey = fromQuery && fromQuery in TEMPLATE_DESIGN_DATA ? fromQuery : 'modern';
    let customization = TEMPLATE_DESIGN_DATA[key].defaults;
    let savedContent: Partial<typeof SAMPLE_CV> | null = null;

    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem(`cv-draft-${resumeId}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            templateKey?: TemplateKey;
            customization?: typeof customization;
            content?: Partial<typeof SAMPLE_CV>;
          };
          if (parsed.templateKey) key = parsed.templateKey;
          if (parsed.customization) customization = parsed.customization;
          if (parsed.content) savedContent = parsed.content;
        } catch {
          /* ignore */
        }
      }
    }

    const base = emptyContent(key);
    hydrate(
      resumeId,
      {
        ...base,
        identity: savedContent?.identity
          ? { ...SAMPLE_CV.identity, ...savedContent.identity }
          : { ...SAMPLE_CV.identity, fullName: '' },
        summary: savedContent?.summary ?? { text: SAMPLE_CV.summary.text },
        experiences: savedContent?.experiences ?? SAMPLE_CV.experiences,
        education: savedContent?.education ?? SAMPLE_CV.education,
        skills: savedContent?.skills ?? SAMPLE_CV.skills,
        languages: savedContent?.languages ?? SAMPLE_CV.languages,
        projects: savedContent?.projects ?? SAMPLE_CV.projects,
        certificates: savedContent?.certificates ?? SAMPLE_CV.certificates,
        references: savedContent?.references ?? SAMPLE_CV.references ?? [],
        customization,
        templateKey: key,
      },
      key
    );
  }, [resumeId, searchParams, hydrate]);

  useAutosave(resumeId);
  const previewContent = useDebouncedValue(content, 150);

  return (
    <div className="editor-shell flex h-[calc(100dvh-3.5rem)] flex-col" data-testid="cv-editor">
      <div className="flex items-center justify-between border-b border-border bg-surface-card px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="text-sm text-[color:var(--cv-text-secondary)]" aria-live="polite">
            {saveStatus === 'saving' && 'Enregistrement…'}
            {saveStatus === 'saved' && 'Enregistré'}
            {saveStatus === 'error' && 'Impossible d’enregistrer'}
            {saveStatus === 'idle' && '—'}
          </div>
          <label className="hidden items-center gap-2 text-xs md:flex">
            Template
            <select
              className="rounded-md border border-border bg-surface-card px-2 py-1 text-sm"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
            >
              {(Object.keys(TEMPLATE_DESIGN_DATA) as TemplateKey[]).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={drawer === 'template' || drawer === null}
            onClick={() => {
              setDrawer('template');
              setMobileTab('tools');
            }}
          >
            Style
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={drawer === 'ats'}
            className={cn(drawer === 'ats' && 'bg-primary-subtle text-primary')}
            onClick={() => {
              setDrawer('ats');
              setMobileTab('tools');
            }}
          >
            ATS
          </Button>
          <ExportPDFButton
            cvId={resumeId}
            content={content}
            templateKey={templateKey}
            cvName={content.identity.fullName || 'CV'}
          />
        </div>
      </div>

      <div className="flex border-b border-border md:hidden">
        {(['content', 'preview', 'tools'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              'flex-1 py-3 text-sm font-medium',
              mobileTab === tab && 'border-b-2 border-primary text-primary'
            )}
            onClick={() => setMobileTab(tab)}
          >
            {tab === 'content' ? 'Contenu' : tab === 'preview' ? 'Aperçu' : 'Outils'}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[64px_minmax(280px,38fr)_6px_minmax(320px,52fr)_minmax(220px,0.9fr)]">
        <nav
          className="hidden flex-col gap-1 border-r border-border p-2 md:flex"
          aria-label="Sections du CV"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.label}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'rounded-md px-2 py-2 text-xs',
                activeSection === s.id ? 'bg-primary-subtle text-primary' : 'hover:bg-surface-app'
              )}
            >
              {s.short}
            </button>
          ))}
        </nav>

        <section
          className={cn('min-h-0 overflow-auto p-4', mobileTab !== 'content' && 'hidden md:block')}
          aria-label="Formulaire"
        >
          <h2 className="mb-4 text-sm font-semibold">
            {SECTIONS.find((s) => s.id === activeSection)?.label}
          </h2>
          <ActiveSectionForm section={activeSection} />
        </section>

        <div className="hidden bg-border md:block" role="separator" aria-orientation="vertical" />

        <section
          className={cn(
            'min-h-0 overflow-auto bg-[color:var(--cv-color-neutral-100)] p-6 dark:bg-[color:var(--cv-color-neutral-900)]',
            mobileTab !== 'preview' && 'hidden md:block'
          )}
          aria-label="Aperçu du CV en temps réel"
        >
          <div className="mb-3 flex justify-end gap-2">
            {[75, 90, 100].map((z) => (
              <Button
                key={z}
                size="sm"
                variant={previewZoom === z ? 'primary' : 'ghost'}
                onClick={() => setZoom(z)}
              >
                {z}%
              </Button>
            ))}
          </div>
          <div
            className="mx-auto origin-top"
            style={{
              transform: `scale(${previewZoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            <TemplateWrapper templateKey={templateKey} data={previewContent} />
          </div>
        </section>

        <aside
          className={cn(
            'hidden min-h-0 overflow-auto border-l border-border p-3 lg:block',
            mobileTab === 'tools' && '!block'
          )}
          aria-label={drawer === 'ats' ? 'Analyse ATS' : 'Personnalisation du style'}
        >
          {drawer === 'ats' ? (
            <AtsPanel cvId={resumeId} onClose={() => setDrawer('template')} />
          ) : (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--cv-text-secondary)]">
                Style
              </p>
              <label className="mb-3 flex items-center justify-between text-sm">
                Photo
                <input
                  type="checkbox"
                  checked={content.customization?.showPhoto ?? true}
                  onChange={(e) => patchCustomization({ showPhoto: e.target.checked })}
                />
              </label>
              <label className="mb-3 block text-sm">
                Primary
                <input
                  type="color"
                  className="mt-1 h-9 w-full"
                  value={content.customization?.primaryColor ?? '#2563eb'}
                  onChange={(e) => patchCustomization({ primaryColor: e.target.value })}
                  disabled={templateKey === 'ats'}
                />
              </label>
              <label className="mb-3 block text-sm">
                Accent
                <input
                  type="color"
                  className="mt-1 h-9 w-full"
                  value={content.customization?.accentColor ?? '#2563eb'}
                  onChange={(e) => patchCustomization({ accentColor: e.target.value })}
                  disabled={templateKey === 'ats'}
                />
              </label>
              <div className="flex gap-1">
                {(['compact', 'normal', 'spacious'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={cn(
                      'flex-1 rounded border px-1 py-1 text-[10px] capitalize',
                      content.customization?.density === d
                        ? 'border-primary text-primary'
                        : 'border-border'
                    )}
                    onClick={() => patchCustomization({ density: d })}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
