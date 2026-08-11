import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { runSyncCycle } from '../db/sync/engine';
import { useAuthStore } from '../stores/auth-store';
import { useSyncStore } from '../stores/sync-store';

/** Starts NetInfo-driven sync when authenticated. */
export function useSyncEngine() {
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;

    const t = setTimeout(() => {
      void runSyncCycle();
    }, 1000);

    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void runSyncCycle();
      } else {
        useSyncStore.getState().setStatus('offline');
      }
    });

    const interval = setInterval(() => {
      void runSyncCycle();
    }, 60_000);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
      unsub();
    };
  }, [token]);
}
