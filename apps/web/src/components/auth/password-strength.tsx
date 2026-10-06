'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const RULES = [
  { id: 'length', label: '12 caractères minimum', test: (p: string) => p.length >= 12 },
  { id: 'upper', label: 'Une majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Une minuscule', test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Un chiffre', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'Un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

const STRENGTH_LABELS = ['Faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Très fort'] as const;

export function passwordScore(password: string): number {
  return RULES.reduce((score, rule) => score + (rule.test(password) ? 1 : 0), 0);
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const score = passwordScore(password);
  const label = STRENGTH_LABELS[score] ?? 'Faible';
  const barClass = score <= 2 ? 'bg-error' : score === 3 ? 'bg-warning' : 'bg-success';

  return (
    <div className="mt-2 space-y-2" data-testid="password-strength">
      <div className="flex gap-1" aria-hidden>
        {RULES.map((rule, i) => (
          <div
            key={rule.id}
            className={cn('h-1.5 flex-1 rounded-full', i < score ? barClass : 'bg-surface-app')}
          />
        ))}
      </div>
      <p className="text-xs text-content-secondary">
        Robustesse : <span className="font-medium text-content-primary">{label}</span>
      </p>
      <ul className="space-y-1">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className="flex items-center gap-2 text-xs">
              {ok ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 text-content-muted" aria-hidden />
              )}
              <span className={ok ? 'text-content-secondary' : 'text-content-muted'}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
