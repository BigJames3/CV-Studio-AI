'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { marketplaceApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { formatListingPrice } from '@/lib/marketplace/types';

type PayoutsResponse = Awaited<ReturnType<typeof marketplaceApi.listPayouts>>;
type PayoutBank = Awaited<ReturnType<typeof marketplaceApi.payoutBanks>>['items'][number];

const COUNTRIES = ['CI', 'SN', 'CM', 'FR', 'BE', 'CH', 'CA', 'US', 'GB', 'MA'] as const;

function payoutErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion ou réessayez.';
  }
  switch (err.code) {
    case 'PAYOUT_BANK_UNKNOWN':
      return 'Banque ou opérateur Mobile Money inconnu. Rechargez la page et choisissez-en un dans la liste.';
    case 'PAYOUT_ACCOUNT_REJECTED':
      // The message carries Paystack's reason (wrong number, account name mismatch…).
      return err.message;
    case 'SELLER_BLOCKED':
      return 'Votre profil vendeur est suspendu ou refusé : contactez le support.';
    case 'NOT_SELLER':
      return 'Créez d’abord votre profil vendeur.';
    case 'PAYMENTS_NOT_CONFIGURED':
    case 'PAYMENT_PROVIDER_UNAVAILABLE':
      return 'Les versements sont momentanément indisponibles. Réessayez plus tard.';
    case 'VALIDATION_ERROR':
      return 'Le numéro de compte doit contenir de 6 à 20 chiffres.';
  }
  return err.message || 'Impossible d’enregistrer le compte de versement.';
}

export function SellerPayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutsResponse | null>(null);
  const [needsApply, setNeedsApply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [banks, setBanks] = useState<PayoutBank[] | null>(null);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSaved, setAccountSaved] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await marketplaceApi.listPayouts();
      setPayouts(data);
      setNeedsApply(false);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === 'NOT_SELLER')) {
        setNeedsApply(true);
        setPayouts(null);
        return;
      }
      setError(err instanceof Error ? err.message : 'Impossible de charger les versements');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showAccountForm = Boolean(payouts && (!payouts.payoutAccount || editingAccount));

  useEffect(() => {
    if (!showAccountForm || banks) return;
    let cancelled = false;
    marketplaceApi
      .payoutBanks()
      .then((data) => {
        if (!cancelled) setBanks(data.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setBanksError(payoutErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [showAccountForm, banks]);

  async function onSaveAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setAccountError(null);
    setAccountSaved(false);
    const form = new FormData(e.currentTarget);
    const bankCode = String(form.get('bankCode') ?? '');
    const accountNumber = String(form.get('accountNumber') ?? '').replace(/\s+/g, '');
    try {
      const state = await marketplaceApi.setPayoutAccount({ bankCode, accountNumber });
      setPayouts((prev) => (prev ? { ...prev, ...state } : prev));
      setAccountSaved(true);
      setEditingAccount(false);
    } catch (err) {
      setAccountError(payoutErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function onApply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get('displayName') ?? '').trim();
    const country = String(form.get('country') ?? 'CI');
    const slug =
      displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `seller-${Date.now().toString(36)}`;
    try {
      await marketplaceApi.applySeller({ displayName, slug, country });
      setNeedsApply(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le profil vendeur');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-2xl font-semibold">Versements</h1>
      <p className="mt-2 text-sm text-content-secondary">
        Chaque vente est partagée automatiquement par Paystack : votre part (70 % du net après frais
        de paiement) est versée sur votre compte bancaire ou Mobile Money selon le calendrier de
        règlement de Paystack (en général 2 à 3 jours ouvrés). Enregistrez un compte de versement
        pour pouvoir publier des modèles.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {needsApply ? (
        <form
          className="mt-8 max-w-md space-y-4"
          onSubmit={onApply}
          data-testid="seller-apply-form"
        >
          <p className="text-sm">
            Créez votre profil vendeur, puis enregistrez votre compte de versement.
          </p>
          <label className="block text-sm font-medium">
            Nom affiché
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              name="displayName"
              required
              minLength={2}
              data-testid="seller-display-name"
            />
          </label>
          <label className="block text-sm font-medium">
            Pays
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              name="country"
              defaultValue="CI"
              data-testid="seller-country"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={pending} data-testid="seller-apply-submit">
            {pending ? 'Enregistrement…' : 'Devenir vendeur'}
          </Button>
        </form>
      ) : null}

      {payouts ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-content-secondary">{payouts.displayName}</p>
            <p className="mt-1 font-medium" data-testid="seller-payout-status">
              Statut : {payouts.status}
              {payouts.payoutsEnabled ? ' · versements actifs' : ' · versements non configurés'}
            </p>
            {payouts.payoutAccount ? (
              <p className="mt-2 text-sm" data-testid="seller-payout-account">
                Compte de versement : {payouts.payoutAccount.bankName ?? 'compte enregistré'}
                {payouts.payoutAccount.last4
                  ? ` · se terminant par ${payouts.payoutAccount.last4}`
                  : ''}
              </p>
            ) : null}
            {accountSaved ? (
              <p className="mt-2 text-sm text-success" role="status">
                Compte de versement enregistré. Vous pouvez publier vos modèles.
              </p>
            ) : null}

            {showAccountForm ? (
              <form
                className="mt-4 max-w-md space-y-4"
                onSubmit={onSaveAccount}
                data-testid="seller-payout-account-form"
              >
                {banksError ? (
                  <p className="text-sm text-error" role="alert">
                    {banksError}
                  </p>
                ) : null}
                <label className="block text-sm font-medium">
                  Banque ou opérateur Mobile Money
                  <select
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                    name="bankCode"
                    required
                    defaultValue=""
                    disabled={!banks}
                    data-testid="seller-payout-bank"
                  >
                    <option value="" disabled>
                      {banks ? 'Choisir…' : 'Chargement…'}
                    </option>
                    {(banks ?? []).map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                        {bank.type === 'mobile_money' ? ' (Mobile Money)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Numéro de compte ou de téléphone Mobile Money
                  <input
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                    name="accountNumber"
                    required
                    inputMode="numeric"
                    pattern="[0-9 ]{6,24}"
                    title="De 6 à 20 chiffres"
                    autoComplete="off"
                    data-testid="seller-payout-account-number"
                  />
                </label>
                {accountError ? (
                  <p className="text-sm text-error" role="alert">
                    {accountError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={pending || !banks}
                    data-testid="seller-payout-account-submit"
                  >
                    {pending ? 'Vérification…' : 'Enregistrer le compte'}
                  </Button>
                  {editingAccount ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        setEditingAccount(false);
                        setAccountError(null);
                      }}
                    >
                      Annuler
                    </Button>
                  ) : null}
                </div>
              </form>
            ) : (
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => {
                  setAccountSaved(false);
                  setEditingAccount(true);
                }}
                data-testid="seller-payout-account-edit"
              >
                Changer de compte de versement
              </Button>
            )}
          </div>

          {payouts.items.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold">Historique des versements</h2>
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2">Période</th>
                    <th>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.items.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="py-2">
                        {new Date(row.periodStart).toLocaleDateString('fr-FR')} –{' '}
                        {new Date(row.periodEnd).toLocaleDateString('fr-FR')}
                      </td>
                      <td>{formatListingPrice(row.amountCents, row.currency)}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
