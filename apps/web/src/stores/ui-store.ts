import { create } from 'zustand';

type PaywallState = {
  open: boolean;
  trigger?: string;
  feature?: string;
};

type UiState = {
  theme: 'system' | 'light' | 'dark';
  paywall: PaywallState;
  setTheme: (t: UiState['theme']) => void;
  openPaywall: (trigger: string, feature?: string) => void;
  closePaywall: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  theme: 'system',
  paywall: { open: false },
  setTheme: (theme) => set({ theme }),
  openPaywall: (trigger, feature) => set({ paywall: { open: true, trigger, feature } }),
  closePaywall: () => set({ paywall: { open: false } }),
}));
