import * as React from 'react';
import { cn } from '../lib/utils';

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export function Code({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn(
        'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
        className
      )}
      {...props}
    />
  );
}

export function FieldError({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p className={cn('text-sm text-destructive', className)} role="alert">
      {children}
    </p>
  );
}

export function Banner({
  children,
  className,
  tone = 'info',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'info' | 'warning' | 'offline';
}) {
  return (
    <div
      className={cn(
        'px-4 py-2 text-center text-sm font-medium',
        tone === 'warning' && 'bg-[hsl(var(--warning))]/20 text-foreground',
        tone === 'offline' && 'bg-[hsl(var(--warning))] text-foreground',
        tone === 'info' && 'bg-primary/10 text-foreground',
        className
      )}
      role="status"
    >
      {children}
    </div>
  );
}

export function OfflineBanner({ className }: { className?: string }) {
  return (
    <Banner tone="offline" className={className}>
      You are offline — changes will sync when you reconnect
    </Banner>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={item.label} className="inline-flex items-center gap-1">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <a className="hover:text-foreground" href={item.href}>
                {item.label}
              </a>
            ) : (
              <span className="text-foreground" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="navigation"
      aria-label="Pagination"
    >
      <button
        type="button"
        className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-muted-foreground">
        {page} / {pageCount}
      </span>
      <button
        type="button"
        className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={cn(
            'rounded-sm px-3 py-1.5 text-sm font-medium',
            value === o.value ? 'bg-background shadow-sm' : 'text-muted-foreground'
          )}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex w-full items-center gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
              i <= current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {i + 1}
          </span>
          <span className="hidden text-sm sm:inline">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function ButtonGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex overflow-hidden rounded-md border [&>button]:rounded-none [&>button]:border-0',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SearchInput(props: React.ComponentProps<'input'>) {
  return (
    <input
      {...props}
      type="search"
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
        props.className
      )}
      aria-label={props['aria-label'] ?? 'Search'}
    />
  );
}
