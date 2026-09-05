'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { marketplaceApi } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

type PayoutsResponse = Awaited<ReturnType<typeof marketplaceApi.listPayouts>>;

const COUNTRIES = ['FR', 'BE', 'CH', 'CA', 'US', 'GB', 'CI', 'SN', 'CM', 'MA'] as const;

export function SellerPayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutsResponse | null>(null);
  const [needsApply, setNeedsApply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [onboardingNote, setOnboardingNote] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'Unable to load payouts');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const onboarding = params.get('onboarding');
    void (async () => {
      if (onboarding === 'return' || onboarding === 'refresh') {
        try {
          await marketplaceApi.refreshConnectAccount();
          setOnboardingNote(
            onboarding === 'return'
              ? 'Verification updated from Stripe. You can list templates once payouts are enabled.'
              : 'Onboarding session expired. Start verification again.'
          );
        } catch {
          setOnboardingNote('Could not refresh Stripe status. Try Continue verification.');
        }
      }
      await load();
    })();
  }, [load]);

  async function startOnboarding() {
    setPending(true);
    setError(null);
    try {
      const { url } = await marketplaceApi.startConnectOnboarding();
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Stripe verification');
      setPending(false);
    }
  }

  async function openDashboard() {
    setPending(true);
    setError(null);
    try {
      const { url } = await marketplaceApi.connectLoginLink();
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Stripe dashboard');
      setPending(false);
    }
  }

  async function onApply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get('displayName') ?? '').trim();
    const country = String(form.get('country') ?? 'FR');
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
      setError(err instanceof Error ? err.message : 'Could not create seller profile');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-2xl font-semibold">Payouts</h1>
      <p className="mt-2 text-sm text-content-secondary">
        Weekly transfers · minimum $25 · new sellers: 14-day 10% reserve. Complete Stripe identity
        verification so destination charges can pay you 70% of net.
      </p>

      {onboardingNote ? (
        <p className="mt-4 rounded-lg border border-border px-3 py-2 text-sm" role="status">
          {onboardingNote}
        </p>
      ) : null}
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
          <p className="text-sm">Create a seller profile, then verify payouts with Stripe.</p>
          <label className="block text-sm font-medium">
            Display name
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              name="displayName"
              required
              minLength={2}
              data-testid="seller-display-name"
            />
          </label>
          <label className="block text-sm font-medium">
            Country
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              name="country"
              defaultValue="FR"
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
            {pending ? 'Saving…' : 'Become a seller'}
          </Button>
        </form>
      ) : null}

      {payouts ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-content-secondary">{payouts.displayName}</p>
            <p className="mt-1 font-medium" data-testid="seller-connect-status">
              Status: {payouts.status}
              {payouts.payoutsEnabled ? ' · payouts enabled' : ' · payouts not enabled'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!payouts.payoutsEnabled ? (
                <Button
                  disabled={pending}
                  onClick={() => void startOnboarding()}
                  data-testid="seller-connect-start"
                >
                  {pending ? 'Redirecting…' : 'Continue Stripe verification'}
                </Button>
              ) : (
                <Button
                  disabled={pending}
                  onClick={() => void openDashboard()}
                  data-testid="seller-connect-dashboard"
                >
                  Open payouts dashboard
                </Button>
              )}
            </div>
          </div>

          <section>
            <h2 className="text-lg font-semibold">Transfer history</h2>
            {payouts.items.length === 0 ? (
              <p className="mt-2 text-sm text-content-secondary">No payouts yet. Minimum $25.</p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2">Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.items.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="py-2">
                        {new Date(row.periodStart).toLocaleDateString('en-GB')} –{' '}
                        {new Date(row.periodEnd).toLocaleDateString('en-GB')}
                      </td>
                      <td>
                        {(row.amountCents / 100).toFixed(2)} {row.currency}
                      </td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
