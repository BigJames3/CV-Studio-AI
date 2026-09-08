'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function UserMenu({
  label,
  email,
  logoutPending,
  onLogout,
}: {
  label: string;
  email?: string;
  logoutPending: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div
      className="relative"
      ref={rootRef}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label="Menu compte"
        title={email || 'Menu compte'}
        data-testid="user-menu-trigger"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open ? (
        <div
          id="user-menu"
          role="menu"
          aria-orientation="vertical"
          aria-label="Menu compte"
          className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-border bg-surface-card py-1 shadow-1"
        >
          <p className="truncate px-3 py-2 text-xs text-content-muted">{email ?? 'Compte'}</p>
          <Link
            href="/account/profile"
            role="menuitem"
            className="flex min-h-12 items-center px-3 text-sm hover:bg-surface-app"
            onClick={() => setOpen(false)}
          >
            Mon profil
          </Link>
          <Link
            href="/account/settings"
            role="menuitem"
            className="flex min-h-12 items-center px-3 text-sm hover:bg-surface-app"
            onClick={() => setOpen(false)}
          >
            Paramètres
          </Link>
          <Link
            href="/account/billing"
            role="menuitem"
            className="flex min-h-12 items-center px-3 text-sm hover:bg-surface-app"
            onClick={() => setOpen(false)}
          >
            Abonnement
          </Link>
          <button
            type="button"
            role="menuitem"
            data-testid="logout-menu-item"
            className={cn(
              'flex min-h-12 w-full items-center px-3 text-left text-sm text-error hover:bg-surface-app',
              logoutPending && 'opacity-50'
            )}
            disabled={logoutPending}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            {logoutPending ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
