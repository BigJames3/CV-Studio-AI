'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Alias: checklist URL `/dashboard/profile` → canonical `/account/profile`. */
export default function DashboardProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/account/profile');
  }, [router]);

  return <div className="p-8 text-sm">Redirection vers le profil…</div>;
}
