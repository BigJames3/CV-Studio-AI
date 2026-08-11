import * as React from 'react';
import { Button } from './button';

/** Renders children if entitled; otherwise CTA to upgrade. */
export function EntitlementGate({
  allowed,
  children,
  fallback,
}: {
  allowed: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (allowed) return <>{children}</>;
  return (
    fallback ?? (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">This feature requires Pro.</p>
        <Button className="mt-3">Upgrade</Button>
      </div>
    )
  );
}
