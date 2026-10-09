'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cvsApi, marketplaceApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { emptyContent } from '@/stores/editor-store';
import type { TemplateKey } from '@/lib/templates/types';

// The API only accepts seller designs built on an editor layout key.
type Design = { key?: TemplateKey; defaults?: Record<string, unknown> };

/** Opens a new CV with the purchased design. The API re-checks the licence on create. */
export function UseLicenceButton({ listingId, title }: { listingId: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUse() {
    setPending(true);
    setError(null);
    try {
      const { templateId, designData } = await marketplaceApi.getDesign(listingId);
      const design = (designData ?? {}) as Design;
      const cv = (await cvsApi.create({
        title: `CV — ${title}`,
        templateId,
        content: { ...emptyContent(design.key ?? 'modern'), customization: design.defaults },
      })) as { id: string };
      router.push(`/editor/${cv.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ENTITLEMENT_REQUIRED') {
        setError('Vous avez atteint la limite de CV de votre formule.');
      } else if (err instanceof ApiError && err.code === 'TEMPLATE_LICENCE_REQUIRED') {
        setError('Votre licence pour ce modèle n’est plus active.');
      } else {
        setError('Impossible de créer le CV. Réessayez.');
      }
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <Button
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() => void onUse()}
        data-testid="marketplace-use"
      >
        {pending ? 'Création du CV…' : 'Utiliser ce modèle'}
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
