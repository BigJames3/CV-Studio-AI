import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

type SyncState = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  lastError: string | null;
  setStatus: (s: SyncStatus) => void;
  setPending: (n: number) => void;
  markSynced: () => void;
  setError: (msg: string | null) => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  pendingCount: 0,
  lastError: null,
  setStatus: (status) => set({ status }),
  setPending: (pendingCount) => set({ pendingCount }),
  markSynced: () =>
    set({ lastSyncedAt: new Date().toISOString(), status: 'idle', lastError: null }),
  setError: (lastError) => set({ lastError, status: lastError ? 'error' : 'idle' }),
}));
