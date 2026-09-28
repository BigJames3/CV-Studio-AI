'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { SUPPORT_BUSINESS_MAILTO } from '@/lib/billing/plans-catalog';
import { getCvLimit } from '@cvstudio/shared-utils';

const featureNames: Record<string, { title: string; description: string }> = {
  'cv:create': {
    title: '🎯 Limite atteinte',
    description: 'Vous avez atteint la limite de CV de votre plan.',
  },
  'cv:duplicate': {
    title: '🔒 Fonctionnalité Premium',
    description: 'La duplication de CV est réservée aux utilisateurs Premium.',
  },
  'cv:export:pdf': {
    title: '📥 Export PDF',
    description: "L'export PDF est réservé aux plans Pro et Business.",
  },
  'cv:print': {
    title: '🖨️ Impression',
    description: "L'impression est réservée aux plans Pro et Business.",
  },
  'cv:share': {
    title: '🔗 Partage de CV',
    description: 'Le partage public est réservé aux plans Pro et Business.',
  },
  'templates:pro': {
    title: '🎨 Templates premium',
    description: 'Les templates premium sont inclus dans les plans Pro et Business.',
  },
  'ai:generate': {
    title: '✨ Génération IA',
    description: 'La génération de contenu IA est réservée aux utilisateurs Premium.',
  },
  'marketplace:buy': {
    title: 'Marketplace Pro',
    description: 'L’achat de templates créateurs est réservé aux plans Pro et Business.',
  },
};

const PREMIUM_BENEFITS = [
  'Jusqu’à 5 CVs (Pro) ou 20 (Business)',
  'Export PDF haute qualité',
  'Optimisation IA du contenu',
  'Templates premium exclusifs',
  'Partage public avec lien et QR code',
  '14 jours gratuits',
] as const;

const BUSINESS_CV_LIMIT = getCvLimit('business');

export type PaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  cvCount?: number;
  cvLimit?: number;
  /** Current plan: the CV-limit message depends on it (Business has no plan above). */
  tier?: 'free' | 'pro' | 'business';
  /** Pre-fills the support e-mail for a Business quota request. */
  userEmail?: string;
};

/** Support e-mail for a Business user asking for more CVs (option A, validated by product). */
export function businessQuotaMailto(cvCount: number, cvLimit: number, email?: string): string {
  const subject = 'Augmentation du quota de CV (Business)';
  const body = [
    'Bonjour,',
    '',
    `J'utilise ${cvCount}/${cvLimit} CV sur mon plan Business et j'aurais besoin d'une capacité plus élevée.`,
    '',
    'Mon besoin (nombre de CV, usage) :',
    '',
    email ? `Compte : ${email}` : '',
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n');
  const base = SUPPORT_BUSINESS_MAILTO.split('?')[0];
  return `${base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function PaywallModal({
  isOpen,
  onClose,
  feature = 'cv:create',
  cvCount = 0,
  cvLimit = 1,
  tier = 'free',
  userEmail,
}: PaywallModalProps) {
  const router = useRouter();
  const isCvLimit = feature === 'cv:create';
  // Only the CV quota differs between Pro and Business; Business has nothing above it.
  const variant: 'premium' | 'business-upgrade' | 'business-support' = !isCvLimit
    ? 'premium'
    : tier === 'business'
      ? 'business-support'
      : tier === 'pro'
        ? 'business-upgrade'
        : 'premium';

  const copy =
    variant === 'business-support'
      ? {
          title: '🎯 Limite du plan Business atteinte',
          description: `Vous avez atteint les ${cvLimit} CV de votre plan Business. Besoin de plus ? Contactez notre support pour augmenter votre capacité.`,
        }
      : variant === 'business-upgrade'
        ? {
            title: '🎯 Limite du plan Pro atteinte',
            description: `Vous avez atteint les ${cvLimit} CV du plan Pro. Passez à Business pour gérer jusqu’à ${BUSINESS_CV_LIMIT} CV.`,
          }
        : (featureNames[feature] ?? {
            title: '🔒 Fonctionnalité Premium',
            description: 'Cette fonctionnalité est réservée aux utilisateurs Premium.',
          });

  const safeLimit = Math.max(cvLimit, 1);
  const usagePercent = Math.min(100, Math.round((cvCount / safeLimit) * 100));

  useEffect(() => {
    if (isOpen) track('paywall_viewed', { feature, variant });
  }, [isOpen, feature, variant]);

  return (
    <Dialog
      open={isOpen}
      // Critical: sync Radix dismiss (overlay / Escape / X) with Zustand closePaywall
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" data-testid="paywall-modal">
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

        {variant === 'premium' ? (
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
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Plus tard
          </Button>
          {variant === 'business-support' ? (
            <a
              href={businessQuotaMailto(cvCount, cvLimit, userEmail)}
              data-testid="paywall-contact-support"
              className={cn(buttonVariants({ variant: 'primary' }), 'w-full sm:w-auto')}
              onClick={() => {
                track('cv_limit_support_clicked', { cvCount, cvLimit });
                onClose();
              }}
            >
              Contacter le support
            </a>
          ) : (
            <Button
              type="button"
              data-testid="paywall-upgrade"
              className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-1 hover:from-purple-700 hover:to-blue-700 sm:w-auto"
              onClick={() => {
                track('paywall_cta_clicked', { feature, variant });
                onClose();
                router.push('/account/billing?utm_source=paywall&utm_medium=modal');
              }}
            >
              {variant === 'business-upgrade' ? 'Passer à Business' : 'Passer à Premium'}
            </Button>
          )}
        </DialogFooter>

        {/* The trial only comes with a first subscription. */}
        {tier === 'free' ? (
          <p className="text-center text-xs text-content-muted dark:text-neutral-500">
            Premiers 14 jours gratuits
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
