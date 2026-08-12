'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLogout, useMe, useUserPlan } from '@/hooks';
import { cn } from '@/lib/utils';

export function AppTopbar() {
  const { data: me } = useMe();
  const { tier, isFree, isPro, isBusiness } = useUserPlan();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const label = me
    ? `${me.firstName?.[0] ?? ''}${me.lastName?.[0] ?? ''}`.toUpperCase() || me.email.slice(0, 2)
    : '…';

  return (
    <header className="app-topbar no-print flex h-14 items-center justify-between border-b border-border bg-surface-card px-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-semibold">
          CV Studio <span className="text-primary">AI</span>
        </Link>
        <nav className="hidden gap-3 text-sm md:flex">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/templates">Templates</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/account/profile">Profil</Link>
          <Link href="/account/billing">Facturation</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {me ? (
          <>
            {isFree ? (
              <Link
                href="/account/billing"
                data-testid="plan-badge"
                className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning hover:bg-warning/25"
              >
                Plan Free — Upgrade
              </Link>
            ) : null}
            {isPro ? (
              <span
                data-testid="plan-badge"
                className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                Plan Pro
              </span>
            ) : null}
            {isBusiness ? (
              <span
                data-testid="plan-badge"
                className="rounded-full bg-secondary-subtle px-2.5 py-0.5 text-xs font-medium text-secondary"
              >
                Plan Business
              </span>
            ) : null}
          </>
        ) : (
          <span
            data-testid="plan-badge"
            className="rounded-full bg-secondary-subtle px-2.5 py-0.5 text-xs font-medium capitalize text-secondary"
          >
            {tier}
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="hidden text-error sm:inline-flex"
          data-testid="logout-topbar"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          {logout.isPending ? 'Déconnexion…' : 'Se déconnecter'}
        </Button>

        {isFree ? (
          <Link href="/account/billing">
            <Button size="sm" variant="secondary">
              Upgrade
            </Button>
          </Link>
        ) : (
          <Link href="/account/billing">
            <Button size="sm" variant="ghost">
              Facturation
            </Button>
          </Link>
        )}

        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            data-testid="user-menu-trigger"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {label}
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-border bg-surface-card py-1 shadow-1"
            >
              <p className="truncate px-3 py-2 text-xs text-content-muted">
                {me?.email ?? 'Compte'}
              </p>
              <Link
                href="/account/profile"
                role="menuitem"
                className="block px-3 py-2 text-sm hover:bg-surface-app"
                onClick={() => setMenuOpen(false)}
              >
                Mon profil
              </Link>
              <Link
                href="/account/settings"
                role="menuitem"
                className="block px-3 py-2 text-sm hover:bg-surface-app"
                onClick={() => setMenuOpen(false)}
              >
                Paramètres
              </Link>
              <Link
                href="/account/billing"
                role="menuitem"
                className="block px-3 py-2 text-sm hover:bg-surface-app"
                onClick={() => setMenuOpen(false)}
              >
                Abonnement
              </Link>
              <button
                type="button"
                role="menuitem"
                data-testid="logout-menu-item"
                className={cn(
                  'block w-full px-3 py-2 text-left text-sm text-error hover:bg-surface-app',
                  logout.isPending && 'opacity-50'
                )}
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
              >
                {logout.isPending ? 'Déconnexion…' : 'Se déconnecter'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
