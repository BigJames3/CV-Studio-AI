import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'cvstudio_access_token';
const REFRESH_KEY = 'cvstudio_refresh_token';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  userId: string | null;
  hydrate: () => Promise<void>;
  setSession: (access: string, refresh: string, userId?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  userId: null,
  hydrate: async () => {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    set({ accessToken: access, refreshToken: refresh, hydrated: true });
  },
  setSession: async (access, refresh, userId) => {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    set({ accessToken: access, refreshToken: refresh, userId: userId ?? null });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, userId: null });
  },
}));
