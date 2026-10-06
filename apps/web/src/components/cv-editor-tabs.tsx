'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useEditorStore, type SectionId } from '@/stores/editor-store';
import { EDITOR_SECTION_PANEL_ID, EDITOR_SECTIONS } from '@/components/editor/editor-sections';
import { cn } from '@/lib/utils';

function nextSection(current: SectionId, key: string): SectionId | null {
  const ids = EDITOR_SECTIONS.map((s) => s.id);
  const index = ids.indexOf(current);
  if (index < 0) return ids[0] ?? null;
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return ids[(index + 1) % ids.length];
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return ids[(index - 1 + ids.length) % ids.length];
  }
  if (key === 'Home') return ids[0];
  if (key === 'End') return ids[ids.length - 1];
  return null;
}

export function CvEditorTabs({ visible = true }: { visible?: boolean }) {
  const activeSection = useEditorStore((s) => s.activeSection);
  const setActiveSection = useEditorStore((s) => s.setActiveSection);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = listRef.current?.querySelector('[aria-selected="true"]');
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeSection]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextSection(activeSection, event.key);
    if (!next) return;
    event.preventDefault();
    setActiveSection(next);
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    });
  };

  return (
    <nav
      className={cn('editor-tabs no-print min-w-0 w-full md:hidden', !visible && 'hidden')}
      aria-label="Sections du CV"
      data-testid="editor-section-tabs"
    >
      <div
        ref={listRef}
        className="flex min-w-max gap-1 px-2 py-1"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        {EDITOR_SECTIONS.map((section) => {
          const selected = activeSection === section.id;
          return (
            <button
              key={section.id}
              id={`editor-tab-${section.id}`}
              type="button"
              role="tab"
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              aria-controls={EDITOR_SECTION_PANEL_ID}
              data-testid={`editor-section-${section.id}`}
              className={cn(
                'editor-tab min-h-12 shrink-0 rounded-md px-3 text-sm whitespace-nowrap transition-colors',
                selected
                  ? 'editor-tab-active bg-primary-subtle font-semibold text-primary'
                  : 'text-content-secondary hover:bg-surface-app'
              )}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { CvEditorTabs as EditorSectionTabs };
