'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { enableAnalytics, identify, page, reset } from '@/lib/analytics';
import { useAuthStore } from '@/stores/auth-store';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const lastIdentified = useRef<string | null>(null);

  useEffect(() => {
    enableAnalytics();
  }, []);

  useEffect(() => {
    page(pathname ?? '/');
  }, [pathname]);

  useEffect(() => {
    if (user?.id) {
      if (lastIdentified.current !== user.id) {
        identify(user.id, {
          email: user.email,
          plan: user.subscriptionTier,
        });
        lastIdentified.current = user.id;
      }
      return;
    }
    if (lastIdentified.current) {
      reset();
      lastIdentified.current = null;
    }
  }, [user?.id, user?.email, user?.subscriptionTier]);

  return <>{children}</>;
}
