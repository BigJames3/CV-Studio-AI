'use client';

import { cn } from '@/lib/utils';
import type { GeoLocationSource, PaymentProvider } from '@/lib/utils';
import Link from 'next/link';

const OPTIONS: Array<{
  id: PaymentProvider;
  title: string;
  description: string;
}> = [
  {
    id: 'stripe',
    title: 'Stripe (carte bancaire)',
    description: 'Abonnement renouvelé automatiquement',
  },
  {
    id: 'cinetpay',
    title: 'CinetPay (Mobile Money)',
    description: 'Disponible en Afrique de l’Ouest et Centrale',
  },
];

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  cinetpay: 'CinetPay',
};

export function PaymentMethodSelector({
  value,
  onChange,
  suggestedProvider,
  geoSource,
  disabled,
  cinetpayAvailable = true,
}: {
  value: PaymentProvider;
  onChange: (method: PaymentProvider) => void;
  suggestedProvider?: PaymentProvider;
  geoSource?: GeoLocationSource;
  disabled?: boolean;
  cinetpayAvailable?: boolean;
}) {
  const optionsWithStatus = OPTIONS.map((option) => ({
    ...option,
    unavailable: option.id === 'cinetpay' && !cinetpayAvailable,
  }));

  return (
    <fieldset className="space-y-3" data-testid="payment-method-selector" disabled={disabled}>
      <legend className="font-semibold text-content-primary">Choisissez le mode de paiement</legend>

      {optionsWithStatus.map((option) => {
        const selected = value === option.id;
        const optionDisabled = disabled || option.unavailable;
        return (
          <label
            key={option.id}
            htmlFor={`payment-${option.id}`}
            data-testid={`payment-method-${option.id}`}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              selected ? 'border-primary bg-primary-subtle' : 'border-border bg-surface-app',
              optionDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              disabled && 'opacity-60'
            )}
          >
            <input
              id={`payment-${option.id}`}
              type="radio"
              name="payment-method"
              value={option.id}
              checked={selected}
              disabled={optionDisabled}
              onChange={() => onChange(option.id)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block font-medium text-content-primary">{option.title}</span>
              <span className="block text-sm text-content-secondary">{option.description}</span>
              {option.unavailable ? (
                <span className="mt-1 block text-xs text-content-muted">Non disponible</span>
              ) : null}
            </span>
          </label>
        );
      })}

      {suggestedProvider === 'cinetpay' && !cinetpayAvailable ? (
        <p
          className="text-sm text-content-secondary"
          data-testid="cinetpay-unavailable-notice"
          role="status"
        >
          CinetPay n’est pas disponible pour le moment. Utilisez Stripe (carte bancaire).
        </p>
      ) : null}

      {cinetpayAvailable && suggestedProvider && suggestedProvider !== value ? (
        <p className="text-xs text-primary" data-testid="payment-method-suggestion">
          Nous avons détecté votre localisation et suggérons {PROVIDER_LABEL[suggestedProvider]}.
        </p>
      ) : null}

      {suggestedProvider && suggestedProvider === value && geoSource === 'user-profile' ? (
        <p className="text-xs text-content-secondary" data-testid="payment-method-reason">
          ✓ Basé sur votre profil
        </p>
      ) : null}

      {suggestedProvider && suggestedProvider === value && geoSource === 'browser-ip' ? (
        <p className="text-xs text-content-secondary" data-testid="payment-method-reason">
          ✓ Optimisé pour votre région
        </p>
      ) : null}

      <p className="text-xs text-content-muted">
        <Link href="/account/privacy" className="text-primary underline-offset-2 hover:underline">
          Gérer la localisation et la confidentialité
        </Link>
      </p>
    </fieldset>
  );
}
