import { create } from 'zustand';
import {
  ACCOUNT_BROADCAST_KEY,
  clearClientAuth,
  getAccessToken,
  setAccessToken,
} from '@/lib/api/client';

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
    // Every sign-in path (password, OAuth, 2FA, register) lands here: tell the other tabs,
    // which still hold the previous account's token and data (see LogoutSync).
    if (user?.id && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          ACCOUNT_BROADCAST_KEY,
          JSON.stringify({ id: user.id, at: Date.now() })
        );
      } catch {
        // Private mode / storage disabled: other tabs resync on their next reload.
      }
    }
  },
  clearSession: () => {
    clearClientAuth();
    set({ user: null });
  },
  getToken: () => getAccessToken(),
}));
