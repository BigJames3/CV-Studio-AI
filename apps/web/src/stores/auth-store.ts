import { create } from 'zustand';
import { clearClientAuth, getAccessToken, setAccessToken } from '@/lib/api/client';

type AuthUser = {
  id: string;
  email: string;
  subscriptionTier: string;
  isEmailVerified?: boolean;
  firstName?: string;
  lastName?: string;
};

type AuthState = {
  user: AuthUser | null;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setSession: (accessToken: string, user?: AuthUser | null) => void;
  clearSession: () => void;
  getToken: () => string | null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: true,
  setUser: (user) => set({ user }),
  setSession: (accessToken, user = null) => {
    setAccessToken(accessToken);
    set({ user });
  },
  clearSession: () => {
    clearClientAuth();
    set({ user: null });
  },
  getToken: () => getAccessToken(),
}));
