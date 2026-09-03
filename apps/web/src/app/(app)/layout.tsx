'use client';

import { AppTopbar } from '@/components/layout/app-topbar';
import { PaywallModal } from '@/components/paywall/paywall-modal';
import { GeoConsentBanner } from '@/components/geo-consent-banner';
import { useUiStore } from '@/stores/ui-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { paywall, closePaywall } = useUiStore();

  return (
    <div className="min-h-dvh bg-surface-app">
      <AppTopbar />
      <main id="main">{children}</main>
      <PaywallModal
        isOpen={paywall.open}
        onClose={closePaywall}
        feature={paywall.feature}
        cvCount={paywall.cvCount}
        cvLimit={paywall.cvLimit}
      />
      <GeoConsentBanner />
    </div>
  );
}
