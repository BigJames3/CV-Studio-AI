'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const featureNames: Record<string, { title: string; description: string }> = {
  'cv:create': {
    title: '🎯 Limite atteinte',
    description: 'Vous avez utilisé votre quota de CV gratuit.',
  },
  'cv:duplicate': {
    title: '🔒 Fonctionnalité Premium',
    description: 'La duplication de CV est réservée aux utilisateurs Premium.',
  },
  'cv:export:docx': {
    title: '📄 Export DOCX',
    description: "L'export en DOCX est réservé aux utilisateurs Premium.",
  },
  'ai:generate': {
    title: '✨ Génération IA',
    description: 'La génération de contenu IA est réservée aux utilisateurs Premium.',
  },
};

const PREMIUM_BENEFITS = [
  'CV illimités',
  'Export PDF & DOCX haute qualité',
  'Optimisation IA du contenu',
  'Templates premium exclusifs',
  'Partage public & analytics',
] as const;

export type PaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  cvCount?: number;
  cvLimit?: number;
};

export function PaywallModal({
  isOpen,
  onClose,
  feature = 'cv:create',
  cvCount = 0,
  cvLimit = 1,
}: PaywallModalProps) {
  const router = useRouter();
  const copy = featureNames[feature] ?? {
    title: '🔒 Fonctionnalité Premium',
    description: 'Cette fonctionnalité est réservée aux utilisateurs Premium.',
  };

  const isCvLimit = feature === 'cv:create';
  const safeLimit = Math.max(cvLimit, 1);
  const usagePercent = Math.min(100, Math.round((cvCount / safeLimit) * 100));

  useEffect(() => {
    if (isOpen) {
      track('paywall_viewed', { feature });
    }
  }, [isOpen, feature]);

  return (
    <Dialog
      open={isOpen}
      // Critical: sync Radix dismiss (overlay / Escape / X) with Zustand closePaywall
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {isCvLimit ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-content-primary dark:text-neutral-100">
                {cvCount}/{cvLimit} CV utilisés
              </p>
              <Badge variant="warning">{usagePercent}%</Badge>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--cv-color-neutral-200)] dark:bg-neutral-700"
              role="progressbar"
              aria-valuenow={usagePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Utilisation du quota de CV"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600 transition-[width]"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 p-4 dark:from-purple-950/40 dark:to-blue-950/40">
          <p className="mb-2 text-sm font-semibold text-content-primary dark:text-neutral-100">
            Inclus avec Premium
          </p>
          <ul className="space-y-1.5 text-sm text-content-secondary dark:text-neutral-300">
            {PREMIUM_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-600 dark:text-purple-400" aria-hidden>
                  ✓
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Plus tard
          </Button>
          <Button
            type="button"
            className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-1 hover:from-purple-700 hover:to-blue-700 sm:w-auto"
            onClick={() => {
              track('paywall_cta_clicked', { feature, plan: 'pro' });
              track('upgrade_clicked', { plan: 'pro', source: 'paywall' });
              onClose();
              router.push('/account/billing?plan=pro&utm_source=paywall&utm_medium=modal');
            }}
          >
            Passer à Premium
          </Button>
        </DialogFooter>

        <p className="text-center text-xs text-content-muted dark:text-neutral-500">
          Premiers 14 jours gratuits
        </p>
      </DialogContent>
    </Dialog>
  );
}
