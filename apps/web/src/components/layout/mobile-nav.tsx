'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type MobileNavItem = {
  href: string;
  label: string;
  testId?: string;
};

function isActivePath(pathname: string, href: string, items: MobileNavItem[]) {
  if (href.includes('#')) return false;
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !items.some(
    (other) =>
      other.href !== href &&
      other.href.startsWith(`${href}/`) &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`))
  );
}

export function MobileNav({
  title,
  items,
  footer,
  triggerTestId = 'mobile-nav-trigger',
  triggerClassName,
  sheetTestId = 'mobile-nav-sheet',
}: {
  title: string;
  items: MobileNavItem[];
  footer?: ReactNode;
  triggerTestId?: string;
  triggerClassName?: string;
  sheetTestId?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  const close = () => setOpen(false);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const closeIfDesktop = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener('change', closeIfDesktop);
    return () => mq.removeEventListener('change', closeIfDesktop);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-12 w-12 items-center justify-center rounded-md md:hidden',
            triggerClassName
          )}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls={sheetTestId}
          data-testid={triggerTestId}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </SheetTrigger>
      <SheetContent id={sheetTestId} data-testid={sheetTestId} aria-describedby={undefined}>
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-md"
            aria-label="Fermer le menu"
            data-testid="mobile-nav-close"
            onClick={close}
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label={title}>
          <ul className="space-y-1">
            {items.map((item) => {
              const active = isActivePath(pathname, item.href, items);
              return (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    data-testid={item.testId}
                    onClick={close}
                    className={cn(
                      'flex min-h-12 items-center rounded-md px-3 text-sm font-medium',
                      active
                        ? 'bg-primary-subtle text-primary'
                        : 'text-content-primary hover:bg-surface-app'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {footer ? <div className="border-t border-border p-3">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}
