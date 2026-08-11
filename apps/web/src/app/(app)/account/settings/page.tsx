'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe, useUpdateProfile } from '@/hooks';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { SessionsList } from '@/components/profile/SessionsList';
import { LogoutButton } from '@/components/profile/LogoutButton';
import { TwoFactorSetup } from '@/components/profile/TwoFactorSetup';
import { useAuthStore } from '@/stores/auth-store';

const TABS = [
  { id: 'profile', label: 'Profil' },
  { id: 'security', label: 'Sécurité' },
  { id: 'sessions', label: 'Sessions' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('profile');
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();
  const updateProfile = useUpdateProfile();

  if (isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-sm">Chargement…</div>;
  }
  if (isError || !user) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-error">Non authentifié</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="settings-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Paramètres</h1>
          <p className="mt-2 text-sm text-[color:var(--cv-text-secondary)]">
            Gérez votre profil, la sécurité et les sessions.
          </p>
        </div>
        <Link href="/account/profile" className="text-sm text-primary">
          Vue profil
        </Link>
      </div>

      <div className="mt-6 flex gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={
              tab === t.id
                ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary'
                : 'px-3 py-2 text-sm text-[color:var(--cv-text-secondary)]'
            }
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'profile' && (
          <EditProfileForm
            user={user}
            onCancel={() => router.push('/account/profile')}
            onSave={async (data) => {
              await updateProfile.mutateAsync(data);
            }}
          />
        )}
        {tab === 'security' && (
          <div className="space-y-8">
            <ChangePasswordForm
              onSuccess={() => {
                useAuthStore.getState().clearSession();
                router.push('/login');
              }}
            />
            <TwoFactorSetup enabled={user.is2faEnabled} />
          </div>
        )}
        {tab === 'sessions' && <SessionsList />}
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
