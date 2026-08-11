'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cvsApi, queryKeys, type ListCvsResponse } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { useUiStore } from '@/stores/ui-store';

type RenameInput = { id: string; title: string };
type PublishInput = { id: string; isPublic: boolean };
type StarInput = { id: string; isStarred: boolean };

export type PublishResult = {
  isPublic: boolean;
  share: {
    shareUrl: string | null;
    qrCodeDataUrl: string | null;
  } | null;
};

function isEntitlementRequired(err: unknown): boolean {
  return (
    (err instanceof ApiError && err.code === 'ENTITLEMENT_REQUIRED') ||
    (err instanceof Error && 'code' in err && err.code === 'ENTITLEMENT_REQUIRED')
  );
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Centralized CV mutations with Sonner toasts + paywall on entitlement errors.
 * Uses existing Nest endpoints (`remove`, `publish`, `update` for star/rename).
 */
export function useCvMutations() {
  const qc = useQueryClient();
  const openPaywall = useUiStore((s) => s.openPaywall);

  const invalidateCvs = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.cvs() });
  };

  const remove = useMutation({
    mutationFn: (id: string) => cvsApi.remove(id),
    onSuccess: () => {
      invalidateCvs();
      toast.success('✅ CV supprimé avec succès', {
        description: 'Le CV a été définitivement supprimé de votre bibliothèque',
      });
    },
    onError: (err) => {
      if (isEntitlementRequired(err)) {
        openPaywall('cv:delete', 'cv:delete');
        return;
      }
      toast.error('❌ Erreur lors de la suppression', {
        description: getErrorMessage(err, 'Impossible de supprimer ce CV'),
      });
    },
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => cvsApi.duplicate(id),
    onSuccess: () => {
      invalidateCvs();
      toast.success('✅ CV dupliqué avec succès', {
        description: 'Le nouveau CV est prêt à être modifié',
      });
    },
    onError: (err) => {
      // Critical: free-tier quota → paywall only (no error toast)
      if (isEntitlementRequired(err)) {
        const cached = qc.getQueryData<InfiniteData<ListCvsResponse>>(queryKeys.cvs());
        const cvCount = cached?.pages.flatMap((page) => page.items).length ?? 0;
        openPaywall('cv:duplicate', 'cv:duplicate', {
          cvCount,
          cvLimit: 1,
        });
        return;
      }
      toast.error('❌ Erreur lors de la duplication', {
        description: getErrorMessage(err, 'Impossible de dupliquer ce CV'),
      });
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, title }: RenameInput) => {
      const trimmed = title.trim();
      if (!trimmed) {
        throw new Error('Le titre du CV ne peut pas être vide');
      }
      return cvsApi.update(id, { title: trimmed });
    },
    onSuccess: () => {
      invalidateCvs();
      toast.success('✅ CV renommé avec succès');
    },
    onError: (err) => {
      toast.error('❌ Erreur lors du renommage', {
        description: getErrorMessage(err, 'Impossible de renommer ce CV'),
      });
    },
  });

  const publish = useMutation({
    // isPublic lives on /publish (not PATCH /cvs/:id)
    mutationFn: async ({ id, isPublic }: PublishInput): Promise<PublishResult> => {
      await cvsApi.publish(id, { isPublic });
      if (isPublic) {
        const share = await cvsApi.share(id);
        return {
          isPublic: true,
          share: {
            shareUrl: share.shareUrl,
            qrCodeDataUrl: share.qrCodeDataUrl,
          },
        };
      }
      return { isPublic: false, share: null };
    },
    onSuccess: (data) => {
      invalidateCvs();
      if (data.isPublic) {
        toast.success('✅ CV publié avec succès', {
          description: 'Le CV est maintenant visible publiquement avec un lien partageable',
        });
      } else {
        toast.success('✅ CV dépublié avec succès', {
          description: "Le CV n'est plus visible publiquement",
        });
      }
    },
    onError: (err) => {
      toast.error('❌ Erreur lors de la publication', {
        description: getErrorMessage(err, 'Impossible de modifier la publication'),
      });
    },
  });

  const star = useMutation({
    mutationFn: ({ id, isStarred }: StarInput) => cvsApi.update(id, { isStarred }),
    onSuccess: (_data, variables) => {
      invalidateCvs();
      if (variables.isStarred) {
        toast.success('⭐ CV ajouté aux favoris');
      } else {
        toast.success('☆ Retiré des favoris');
      }
    },
    onError: () => {
      toast.error('❌ Erreur', {
        description: 'Impossible de modifier le statut des favoris',
      });
    },
  });

  return { remove, duplicate, rename, publish, star };
}
