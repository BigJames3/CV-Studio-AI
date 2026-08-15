'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { hydrateAnalyticsConsent, identify, page } from '@/lib/analytics';
import { useAuthStore } from '@/stores/auth-store';

function PageViewTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const last = useRef('');

  useEffect(() => {
    const key = `${pathname}?${search.toString()}`;
    if (last.current === key) return;
    last.current = key;
    page(pathname);
  }, [pathname, search]);

  return null;
}

function IdentifyUser() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;
    identify(user.id, {
      plan: user.subscriptionTier,
      email_verified: Boolean(user.isEmailVerified),
    });
  }, [user?.id, user?.subscriptionTier, user?.isEmailVerified]);

  return null;
}

export function AnalyticsRuntime() {
  useEffect(() => {
    hydrateAnalyticsConsent();
  }, []);

  return (
    <>
      <IdentifyUser />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
