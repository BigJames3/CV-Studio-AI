'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSharedCvs } from '@/hooks/useTeams';

/** CVs teammates shared with me. Hidden when there are none. */
export function SharedCvsSection() {
  const { data } = useSharedCvs();
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mt-10" data-testid="shared-cvs">
      <h2 className="text-xl font-semibold">Partagés avec moi</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((cv) => (
          <div key={cv.id} className="rounded-lg border border-border bg-surface-card p-4 shadow-1">
            <h3 className="truncate font-semibold">{cv.title}</h3>
            <p className="mt-1 text-xs text-content-muted">
              {cv.ownerName} · {cv.teamName} · modifié{' '}
              {new Date(cv.updatedAt).toLocaleString('fr-FR')}
            </p>
            <div className="mt-4">
              <Link href={`/editor/${cv.id}`}>
                <Button size="sm" variant="secondary">
                  {cv.access === 'viewer' ? 'Consulter' : 'Éditer'}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
