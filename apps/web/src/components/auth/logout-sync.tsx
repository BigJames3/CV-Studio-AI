'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_BROADCAST_KEY,
  clearClientAuth,
  getAccessToken,
  LOGOUT_BROADCAST_KEY,
} from '@/lib/api/client';
import { queryKeys } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { resetAnalytics } from '@/lib/analytics';

/** User id carried by the in-memory access token (JWT `sub`), without verifying it. */
function tokenUserId(): string | null {
  const token = getAccessToken();
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Keep every tab on the same account: follow a logout, and reload a tab that still shows
 * another account after a sign-in elsewhere (the refresh cookie is shared by all tabs).
 */
export function LogoutSync() {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.newValue) return;

      if (e.key === LOGOUT_BROADCAST_KEY) {
        clearClientAuth();
        useAuthStore.setState({ user: null });
        resetAnalytics();
        qc.clear();
        router.replace('/login');
        return;
      }

      if (e.key === ACCOUNT_BROADCAST_KEY) {
        let signedInId: string | undefined;
        try {
          signedInId = (JSON.parse(e.newValue) as { id?: string }).id;
        } catch {
          return;
        }
        const me = qc.getQueryData<{ id?: string }>(queryKeys.user.me());
        const shownId = useAuthStore.getState().user?.id ?? me?.id ?? tokenUserId();
        // Same account (e.g. signed in again) or a tab showing no account: nothing to fix.
        if (!signedInId || !shownId || shownId === signedInId) return;
        clearClientAuth();
        useAuthStore.setState({ user: null });
        qc.clear();
        // Full reload: drops every cached query of the previous account.
        window.location.assign('/dashboard');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [qc, router]);

  return null;
}
