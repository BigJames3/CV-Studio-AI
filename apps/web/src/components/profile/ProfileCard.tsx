'use client';

import type { UserProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';

type ProfileCardProps = {
  user: UserProfile;
  editable?: boolean;
  onEdit?: () => void;
};

export function ProfileCard({ user, editable, onEdit }: ProfileCardProps) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div className="rounded-lg border border-border bg-surface-card p-6" data-testid="profile-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-subtle text-lg font-semibold text-primary"
              aria-hidden
            >
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-[color:var(--cv-text-secondary)]">{user.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-[color:var(--cv-text-muted)]">
              {user.subscriptionTier}
              {user.isEmailVerified ? ' · email vérifié' : ' · email non vérifié'}
            </p>
          </div>
        </div>
        {editable && onEdit ? (
          <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
            Éditer
          </Button>
        ) : null}
      </div>
      {user.bio ? (
        <p className="mt-4 text-sm text-[color:var(--cv-text-secondary)]">{user.bio}</p>
      ) : null}
      {(user.phone || user.location) && (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {user.phone ? (
            <div>
              <dt className="text-[color:var(--cv-text-muted)]">Téléphone</dt>
              <dd>{user.phone}</dd>
            </div>
          ) : null}
          {user.location ? (
            <div>
              <dt className="text-[color:var(--cv-text-muted)]">Localisation</dt>
              <dd>{user.location}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
}
