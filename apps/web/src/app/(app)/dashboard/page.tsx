'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useCvs, useCreateCv } from '@/hooks';
import { cvsApi, queryKeys } from '@/lib/api';

export default function DashboardPage() {
  const { data, isLoading, isError } = useCvs();
  const createCv = useCreateCv();
  const qc = useQueryClient();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [shareInfo, setShareInfo] = useState<{
    shareUrl: string;
    qrCodeDataUrl: string;
  } | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => cvsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cvs() }),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => cvsApi.duplicate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cvs() }),
  });

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      cvsApi.update(id, { title }),
    onSuccess: () => {
      setRenamingId(null);
      qc.invalidateQueries({ queryKey: queryKeys.cvs() });
    },
  });

  const publish = useMutation({
    mutationFn: async (id: string) => {
      await cvsApi.publish(id, { isPublic: true });
      return cvsApi.share(id);
    },
    onSuccess: (res) => {
      if (res.shareUrl && res.qrCodeDataUrl) {
        setShareInfo({ shareUrl: res.shareUrl, qrCodeDataUrl: res.qrCodeDataUrl });
      }
      qc.invalidateQueries({ queryKey: queryKeys.cvs() });
    },
  });

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-[color:var(--cv-text-secondary)]">
            {data?.items?.length ?? 0} CV{(data?.items?.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/templates">
            <Button variant="secondary">Nouveau depuis template</Button>
          </Link>
          <Button
            data-testid="create-cv"
            onClick={() =>
              createCv.mutate(
                { title: 'Nouveau CV' },
                {
                  onSuccess: (cv) => {
                    const id = (cv as { id?: string })?.id;
                    if (id) window.location.href = `/editor/${id}`;
                  },
                }
              )
            }
            disabled={createCv.isPending}
          >
            Nouveau CV
          </Button>
        </div>
      </div>

      {isLoading && <p className="mt-8 text-sm">Chargement…</p>}
      {isError && (
        <p className="mt-8 text-sm text-error">
          Impossible de charger les CV (API down ?). Vérifiez `NEXT_PUBLIC_API_URL`.
        </p>
      )}

      {shareInfo && (
        <div className="mt-6 rounded-lg border border-border bg-surface-card p-4">
          <p className="font-medium">Lien public</p>
          <a href={shareInfo.shareUrl} className="mt-1 break-all text-sm text-primary">
            {shareInfo.shareUrl}
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shareInfo.qrCodeDataUrl}
            alt="QR code de partage"
            className="mt-3 h-[160px] w-[160px]"
          />
          <Button type="button" variant="ghost" className="mt-2" onClick={() => setShareInfo(null)}>
            Fermer
          </Button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items?.map((cv) => (
          <div
            key={cv.id}
            className="rounded-lg border border-border bg-surface-card p-4 shadow-1"
          >
            {renamingId === cv.id ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  rename.mutate({ id: cv.id, title: renameValue.trim() || cv.title });
                }}
              >
                <input
                  className="w-full rounded border border-border px-2 py-1 text-sm"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                />
                <Button type="submit" size="sm">
                  OK
                </Button>
              </form>
            ) : (
              <Link href={`/editor/${cv.id}`} className="font-medium hover:text-primary">
                {cv.title}
              </Link>
            )}
            <p className="mt-1 text-xs text-[color:var(--cv-text-muted)]">
              Modifié {new Date(cv.updatedAt).toLocaleString('fr-FR')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/editor/${cv.id}`}>
                <Button size="sm" variant="secondary">
                  Éditer
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRenamingId(cv.id);
                  setRenameValue(cv.title);
                }}
              >
                Renommer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={duplicate.isPending}
                onClick={() => duplicate.mutate(cv.id)}
              >
                Dupliquer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={publish.isPending}
                onClick={() => publish.mutate(cv.id)}
              >
                Partager
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-error"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm('Supprimer ce CV ?')) remove.mutate(cv.id);
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && !data?.items?.length && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center">
            <p className="font-medium">Votre premier CV commence ici</p>
            <p className="mt-1 text-sm text-[color:var(--cv-text-secondary)]">
              Créez un document et éditez-le en dual-pane live.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
