import { create } from 'zustand';

export type PaywallMetadata = {
  cvCount?: number;
  cvLimit?: number;
};

export type PaywallState = {
  open: boolean;
  feature?: string;
  reason?: string;
  cvCount?: number;
  cvLimit?: number;
};

type UiState = {
  theme: 'system' | 'light' | 'dark';
  paywall: PaywallState;
  setTheme: (t: UiState['theme']) => void;
  /** Opens the global paywall modal; metadata carries usage counters for quota UI. */
  openPaywall: (feature: string, reason: string, metadata?: PaywallMetadata) => void;
  closePaywall: () => void;
};

const INITIAL_PAYWALL: PaywallState = {
  open: false,
  feature: undefined,
  reason: undefined,
  cvCount: undefined,
  cvLimit: undefined,
};

export const useUiStore = create<UiState>((set) => ({
  theme: 'system',
  paywall: { ...INITIAL_PAYWALL },
  setTheme: (theme) => set({ theme }),
  openPaywall: (feature, reason, metadata) =>
    set({
      paywall: {
        open: true,
        feature,
        reason,
        cvCount: metadata?.cvCount,
        cvLimit: metadata?.cvLimit,
      },
    }),
  // Reset every field so the next open never shows stale counters
  closePaywall: () => set({ paywall: { ...INITIAL_PAYWALL } }),
}));
