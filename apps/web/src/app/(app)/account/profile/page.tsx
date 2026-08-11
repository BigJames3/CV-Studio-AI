'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe, useUpdateProfile } from '@/hooks';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { SessionsList } from '@/components/profile/SessionsList';
import { LogoutButton } from '@/components/profile/LogoutButton';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfilePage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-sm">Chargement du profil…</div>;
  }

  if (isError || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-error">
        Impossible de charger le profil. Vérifiez votre connexion.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" data-testid="profile-page">
      <h1 className="text-3xl font-semibold">Mon Profil</h1>
      <p className="mt-2 text-sm text-[color:var(--cv-text-secondary)]">
        Vos informations de compte et paramètres de sécurité.
      </p>

      {savedMsg ? (
        <p className="mt-4 rounded-md bg-primary-subtle px-3 py-2 text-sm text-primary" role="status">
          {savedMsg}
        </p>
      ) : null}

      <div className="mt-8">
        {editing ? (
          <EditProfileForm
            user={user}
            onCancel={() => setEditing(false)}
            onSave={async (data) => {
              await updateProfile.mutateAsync(data);
              setEditing(false);
              setSavedMsg('Sauvegarde réussie');
            }}
          />
        ) : (
          <ProfileCard user={user} editable onEdit={() => setEditing(true)} />
        )}
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Sécurité</h2>
        <div>
          <h3 className="mb-3 text-sm font-medium text-[color:var(--cv-text-secondary)]">
            Changer le mot de passe
          </h3>
          <ChangePasswordForm
            onSuccess={() => {
              setSavedMsg('Mot de passe changé — reconnectez-vous');
              useAuthStore.getState().clearSession();
              router.push('/login');
            }}
          />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium text-[color:var(--cv-text-secondary)]">
            Sessions actives
          </h3>
          <SessionsList />
        </div>
        <p className="text-xs text-[color:var(--cv-text-muted)]">
          Authentification à deux facteurs (TOTP) : prévue en Phase 2.
        </p>
      </section>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="mb-3 text-lg font-semibold">Déconnexion</h2>
        <LogoutButton />
      </section>
    </div>
  );
}
