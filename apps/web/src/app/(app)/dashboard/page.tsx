'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateCv, useMe, useUserPlan } from '@/hooks';
import { useCvsInfinite } from '@/hooks/useCvsInfinite';
import { useCvMutations } from '@/hooks/useCvMutations';

export default function DashboardPage() {
  const { data: user } = useMe();
  const { isFree, tier } = useUserPlan();
  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useCvsInfinite();
  const createCv = useCreateCv();
  const { remove, duplicate, rename, publish, star } = useCvMutations();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [shareInfo, setShareInfo] = useState<{
    shareUrl: string;
    qrCodeDataUrl: string;
  } | null>(null);

  const cvs = data?.pages.flatMap((page) => page.items) ?? [];
  const firstName = user?.firstName?.trim();

  const commitRename = (id: string, currentTitle: string) => {
    const next = renameValue.trim();
    if (next && next !== currentTitle) {
      rename.mutate({ id, title: next });
    }
    setRenamingId(null);
  };

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            {firstName ? `Bonjour, ${firstName}` : 'Dashboard'}
          </h1>
          <p className="text-content-secondary">
            {cvs.length} CV{cvs.length === 1 ? '' : 's'}
            {hasNextPage ? '+' : ''}
            {user ? (
              <>
                {' '}
                · Plan{' '}
                <Link
                  href="/account/billing"
                  className="capitalize text-primary underline-offset-2 hover:underline"
                >
                  {tier}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFree ? (
            <Link href="/account/billing">
              <Button variant="outline" size="sm">
                Passer à Pro
              </Button>
            </Link>
          ) : null}
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

      {!isLoading && !isError && cvs.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="font-medium">Votre premier CV commence ici</p>
          <p className="mt-1 text-sm text-content-secondary">
            Créez un document et éditez-le en dual-pane live.
          </p>
        </div>
      ) : null}

      {!isLoading && cvs.length > 0 ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cvs.map((cv) => (
              <div
                key={cv.id}
                className="rounded-lg border border-border bg-surface-card p-4 shadow-1"
              >
                <div className="flex items-start justify-between gap-2">
                  {renamingId === cv.id ? (
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(cv.id, cv.title)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitRename(cv.id, cv.title);
                        }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      autoFocus
                      disabled={rename.isPending}
                      className="h-8"
                    />
                  ) : (
                    <h3
                      className="cursor-pointer font-medium hover:text-primary"
                      onClick={() => {
                        setRenamingId(cv.id);
                        setRenameValue(cv.title);
                      }}
                    >
                      {cv.title}
                    </h3>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    {cv.isPublic ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                        ✓ Publié
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-8 px-2"
                      disabled={star.isPending}
                      aria-label={cv.isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      onClick={() => star.mutate({ id: cv.id, isStarred: !cv.isStarred })}
                    >
                      {star.isPending ? '⏳' : cv.isStarred ? '⭐' : '☆'}
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-content-muted">
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
                    variant="outline"
                    disabled={duplicate.isPending}
                    onClick={() => duplicate.mutate(cv.id)}
                  >
                    {duplicate.isPending ? '⏳ Duplication…' : 'Dupliquer'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={publish.isPending}
                    onClick={() =>
                      publish.mutate(
                        { id: cv.id, isPublic: !cv.isPublic },
                        {
                          onSuccess: (res) => {
                            if (res.share?.shareUrl && res.share.qrCodeDataUrl) {
                              setShareInfo({
                                shareUrl: res.share.shareUrl,
                                qrCodeDataUrl: res.share.qrCodeDataUrl,
                              });
                            } else if (!res.isPublic) {
                              setShareInfo(null);
                            }
                          },
                        }
                      )
                    }
                  >
                    {publish.isPending ? '⏳' : cv.isPublic ? 'Dépublier' : 'Partager'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm('Êtes-vous sûr de vouloir supprimer ce CV ?')) {
                        remove.mutate(cv.id);
                      }
                    }}
                  >
                    {remove.isPending ? '⏳ Suppression…' : 'Supprimer'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {hasNextPage ? (
            <div className="flex justify-center pt-6">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement…
                  </>
                ) : (
                  'Afficher plus de CV'
                )}
              </Button>
            </div>
          ) : (
            <p className="pt-6 text-center text-sm text-content-muted">
              ✓ Tous vos CV sont affichés
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
