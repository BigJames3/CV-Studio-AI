import { create } from 'zustand';

type ThemeMode = 'system' | 'light' | 'dark';

type UiState = {
  themeMode: ThemeMode;
  paywallVisible: boolean;
  toast: string | null;
  setThemeMode: (m: ThemeMode) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  themeMode: 'system',
  paywallVisible: false,
  toast: null,
  setThemeMode: (themeMode) => set({ themeMode }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
