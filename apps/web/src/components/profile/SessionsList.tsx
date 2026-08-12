'use client';

import { useRevokeSession, useSessions } from '@/hooks';
import { Button } from '@/components/ui/button';

export function SessionsList() {
  const { data, isLoading, isError } = useSessions();
  const revoke = useRevokeSession();

  if (isLoading) {
    return <p className="text-sm text-content-secondary">Chargement des sessions…</p>;
  }
  if (isError) {
    return <p className="text-sm text-error">Impossible de charger les sessions.</p>;
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return <p className="text-sm text-content-secondary">Aucune session active.</p>;
  }

  return (
    <ul className="space-y-3" data-testid="sessions-list">
      {items.map((s) => (
        <li
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-card px-4 py-3 text-sm"
        >
          <div>
            <p className="font-medium">{s.userAgent?.slice(0, 80) || 'Appareil inconnu'}</p>
            <p className="text-xs text-content-muted">
              {s.ipAddress || 'IP inconnue'} · expire {new Date(s.expiresAt).toLocaleString()}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate(s.id)}
          >
            Révoquer
          </Button>
        </li>
      ))}
    </ul>
  );
}
