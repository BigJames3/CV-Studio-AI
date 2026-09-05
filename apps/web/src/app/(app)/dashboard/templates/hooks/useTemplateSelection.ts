'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEMPLATE_CATALOG, categoryToKey, getTemplateById } from '@/lib/templates/catalog';
import type { TemplateCustomization, TemplateKey, TemplateListItem } from '@/lib/templates/types';
import { cvsApi } from '@/lib/api';
import { SAMPLE_CV } from '@/lib/templates/sample-cv';
import { useFeatureGate } from '@/hooks/useFeatureGate';

export function useTemplateSelection(initialId?: string) {
  const router = useRouter();
  const templates = TEMPLATE_CATALOG;
  const { canAccessTemplate, showUpgrade, templateAccessTier } = useFeatureGate();

  const initial = initialId ? getTemplateById(initialId) : templates[0];
  const [selectedId, setSelectedId] = useState(initial?.id ?? templates[0].id);
  const [customization, setCustomization] = useState<TemplateCustomization>(
    () => initial?.designData?.defaults ?? templates[0].designData!.defaults
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0],
    [selectedId, templates]
  );

  const templateKey: TemplateKey = categoryToKey(String(selected.category));

  const selectTemplate = useCallback((t: TemplateListItem) => {
    setSelectedId(t.id);
    if (t.designData?.defaults) setCustomization(t.designData.defaults);
    setError(null);
  }, []);

  const patchCustomization = useCallback((patch: Partial<TemplateCustomization>) => {
    setCustomization((c) => ({ ...c, ...patch }));
  }, []);

  const previewData = useMemo(
    () => ({
      ...SAMPLE_CV,
      templateKey,
      customization,
    }),
    [templateKey, customization]
  );

  const createWithTemplate = useCallback(async () => {
    if (!canAccessTemplate(selected)) {
      showUpgrade(
        templateAccessTier(selected) === 'business' ? 'businessTemplates' : 'proTemplates'
      );
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const content = {
        ...SAMPLE_CV,
        identity: { ...SAMPLE_CV.identity, fullName: '' },
        summary: { text: '' },
        experiences: [],
        education: [],
        skills: [],
        languages: [],
        templateKey,
        customization,
        schemaVersion: 1,
      };
      const cv = (await cvsApi.create({
        title: `CV — ${selected.name}`,
        templateId: selected.id,
        content,
      })) as { id: string };
      router.push(`/editor/${cv.id}`);
    } catch {
      // Offline / API down — still open editor with local id for demo
      const localId = `local-${selected.id.slice(0, 8)}`;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `cv-draft-${localId}`,
          JSON.stringify({
            templateId: selected.id,
            templateKey,
            customization,
          })
        );
      }
      router.push(`/editor/${localId}?template=${templateKey}`);
    } finally {
      setCreating(false);
    }
  }, [
    canAccessTemplate,
    customization,
    router,
    selected,
    showUpgrade,
    templateAccessTier,
    templateKey,
  ]);

  return {
    templates,
    selected,
    selectedId,
    templateKey,
    customization,
    previewData,
    creating,
    error,
    selectTemplate,
    patchCustomization,
    createWithTemplate,
  };
}
