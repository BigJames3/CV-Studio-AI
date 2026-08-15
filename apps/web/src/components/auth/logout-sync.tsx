'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { clearClientAuth, LOGOUT_BROADCAST_KEY } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { resetAnalytics } from '@/lib/analytics';

/** Sync logout across browser tabs via localStorage broadcast. */
export function LogoutSync() {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOGOUT_BROADCAST_KEY || !e.newValue) return;
      clearClientAuth();
      useAuthStore.setState({ user: null });
      resetAnalytics();
      qc.clear();
      router.replace('/login');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [qc, router]);

  return null;
}
