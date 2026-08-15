'use client';

import { cn } from '@/lib/utils';
import type { PaymentProvider } from '@/lib/utils';

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
  disabled,
  cinetpayAvailable = true,
}: {
  value: PaymentProvider;
  onChange: (method: PaymentProvider) => void;
  suggestedProvider?: PaymentProvider;
  disabled?: boolean;
  cinetpayAvailable?: boolean;
}) {
  const options = OPTIONS.filter((option) => option.id !== 'cinetpay' || cinetpayAvailable);

  return (
    <fieldset className="space-y-3" data-testid="payment-method-selector" disabled={disabled}>
      <legend className="font-semibold text-content-primary">Choisissez le mode de paiement</legend>

      {options.map((option) => {
        const selected = value === option.id;
        return (
          <label
            key={option.id}
            htmlFor={`payment-${option.id}`}
            data-testid={`payment-method-${option.id}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3',
              selected ? 'border-primary bg-primary-subtle' : 'border-border bg-surface-app',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <input
              id={`payment-${option.id}`}
              type="radio"
              name="payment-method"
              value={option.id}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(option.id)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block font-medium text-content-primary">{option.title}</span>
              <span className="block text-sm text-content-secondary">{option.description}</span>
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
          CinetPay n’est pas encore disponible dans votre région. Utilisez Stripe (carte bancaire).
        </p>
      ) : null}

      {cinetpayAvailable && suggestedProvider && suggestedProvider !== value ? (
        <p className="text-xs text-primary" data-testid="payment-method-suggestion">
          Nous avons détecté votre localisation et suggérons {PROVIDER_LABEL[suggestedProvider]}.
        </p>
      ) : null}
    </fieldset>
  );
}
