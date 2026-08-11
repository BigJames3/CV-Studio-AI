import { AppTopbar } from '@/components/layout/app-topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-app">
      <AppTopbar />
      <main id="main">{children}</main>
    </div>
  );
}
