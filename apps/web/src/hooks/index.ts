'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { authApi, cvsApi, queryKeys, subscriptionsApi } from '@/lib/api';
import { useEditorStore } from '@/stores/editor-store';
import { ApiError } from '@/lib/api/client';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { track, identify, reset } from '@/lib/analytics';
import { useCvsInfinite } from '@/hooks/useCvsInfinite';
import { useMe, useUserPlan } from '@/hooks/useMe';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useInvoices } from '@/hooks/useInvoices';
import {
  useAdminMetrics,
  useAdminRevenueHistory,
  useAdminFunnel,
  useAdminCohort,
  useAdminCac,
  useAdminLtv,
} from '@/hooks/useAdminAnalytics';

export {
  useCvsInfinite,
  useMe,
  useUserPlan,
  useSubscriptionStatus,
  useInvoices,
  useAdminMetrics,
  useAdminRevenueHistory,
  useAdminFunnel,
  useAdminCohort,
  useAdminCac,
  useAdminLtv,
};
export type { User, SubscriptionTier } from '@/hooks/useMe';
export type { BillingStatus } from '@/hooks/useSubscriptionStatus';

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      track('settings_updated', { setting: 'profile' });
      qc.setQueryData(queryKeys.user.me(), data);
      useAuthStore.getState().setUser({
        id: data.id,
        email: data.email,
        subscriptionTier: data.subscriptionTier,
        isEmailVerified: data.isEmailVerified,
        firstName: data.firstName,
        lastName: data.lastName,
      });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => authApi.changePassword(currentPassword, newPassword),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      reset();
      qc.clear();
      useAuthStore.getState().clearSession();
      router.replace('/login');
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => authApi.sessions(),
    staleTime: 30_000,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
}

/** Flat list view over useCvsInfinite (same cache key — no dual-fetch). */
export function useCvs() {
  const infinite = useCvsInfinite();
  const items = infinite.data?.pages.flatMap((page) => page.items) ?? [];
  return {
    ...infinite,
    data: infinite.data
      ? {
          items,
          nextCursor: infinite.data.pages.at(-1)?.nextCursor ?? null,
        }
      : undefined,
  };
}

export function useCv(id: string) {
  const isLocal = id.startsWith('local-');
  return useQuery({
    queryKey: queryKeys.cv(id),
    queryFn: () => cvsApi.get(id),
    enabled: Boolean(id) && !isLocal,
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => subscriptionsApi.me(),
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password, totp }: { email: string; password: string; totp?: string }) =>
      authApi.login(email, password, totp),
    onSuccess: (data) => {
      if (!('requires2fa' in data)) {
        track('login_succeeded');
        identify(data.user.id, {
          email: data.user.email,
          plan: data.user.subscriptionTier,
        });
        qc.invalidateQueries({ queryKey: queryKeys.user.me() });
      }
    },
    onError: () => {
      track('login_failed');
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Parameters<typeof authApi.register>[0]) => {
      track('signup_started', { email: payload.email });
      try {
        const data = await authApi.register(payload);
        track('signup_succeeded', { email: payload.email });
        identify(data.user.id, {
          email: data.user.email,
          plan: data.user.subscriptionTier,
        });
        return data;
      } catch (err) {
        track('signup_failed', { email: payload.email });
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.user.me() }),
  });
}

export function useCreateCv() {
  const qc = useQueryClient();
  const { data: cvsData } = useCvs();

  return useMutation({
    mutationFn: cvsApi.create,
    onSuccess: (cv) => {
      const id = (cv as { id?: string })?.id;
      track('cv_created', { cvId: id });
      qc.invalidateQueries({ queryKey: queryKeys.cvs() });
    },
    onError: (err) => {
      // Show paywall modal only — no toast (global PaywallModal in app layout)
      if (err instanceof ApiError && err.code === 'ENTITLEMENT_REQUIRED') {
        const cvCount = cvsData?.items?.length ?? 0;
        useUiStore.getState().openPaywall('cv:create', 'cv:create', {
          cvCount,
          cvLimit: 1,
        });
      }
    },
  });
}

async function persistEditorContent(
  resumeId: string,
  content: ReturnType<typeof useEditorStore.getState>['content'],
  templateKey: string
) {
  if (resumeId.startsWith('local-')) {
    sessionStorage.setItem(
      `cv-draft-${resumeId}`,
      JSON.stringify({
        templateKey,
        customization: content.customization,
        content,
      })
    );
    return;
  }
  await cvsApi.update(resumeId, { content });
}

/** Autosave ≤5s when editor dirty; also flush on blur / unmount / pagehide. */
export function useAutosave(resumeId: string | null) {
  const dirty = useEditorStore((s) => s.dirty);
  const content = useEditorStore((s) => s.content);
  const templateKey = useEditorStore((s) => s.templateKey);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const markClean = useEditorStore((s) => s.markClean);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);

  const flushNow = async () => {
    if (!resumeId || saving.current) return;
    const state = useEditorStore.getState();
    if (!state.dirty) return;
    saving.current = true;
    setSaveStatus('saving');
    try {
      await persistEditorContent(resumeId, state.content, state.templateKey);
      markClean();
    } catch {
      setSaveStatus('error');
    } finally {
      saving.current = false;
    }
  };

  useEffect(() => {
    if (!resumeId || !dirty) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flushNow();
    }, 5000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // flushNow closes over latest setSaveStatus/markClean/resumeId
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on content dirty only
  }, [resumeId, dirty, content, templateKey]);

  useEffect(() => {
    if (!resumeId) return;

    const onVisibilityOrBlur = () => {
      void flushNow();
    };

    window.addEventListener('blur', onVisibilityOrBlur);
    window.addEventListener('pagehide', onVisibilityOrBlur);
    return () => {
      window.removeEventListener('blur', onVisibilityOrBlur);
      window.removeEventListener('pagehide', onVisibilityOrBlur);
      if (timer.current) clearTimeout(timer.current);
      void flushNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush helpers use store.getState()
  }, [resumeId]);
}

export function useEntitlement(feature: string) {
  const { data } = useSubscription();
  const tier = data?.tier ?? 'free';
  const entitlements = data?.entitlements;

  const map: Record<string, boolean> = {
    'cv:create': entitlements?.cvCreate ?? tier !== 'free',
    'ai:optimize': entitlements?.aiOptimize ?? tier !== 'free',
    'cv:export:docx': false, // coming soon — never gate as available
  };

  return {
    allowed: map[feature] ?? tier !== 'free',
    tier,
    openPaywall: () => useUiStore.getState().openPaywall(feature, feature),
  };
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
