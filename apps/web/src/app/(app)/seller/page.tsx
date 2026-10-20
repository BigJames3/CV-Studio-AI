'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { marketplaceApi } from '@/lib/api';
import { formatListingPrice } from '@/lib/marketplace/types';

type SalesResponse = Awaited<ReturnType<typeof marketplaceApi.sales>>;

export default function SellerHomePage() {
  const [sales, setSales] = useState<SalesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await marketplaceApi.sales();
        if (!cancelled) setSales(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load seller data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listings are priced in the payment currency (XOF by default).
  const salesCurrency = sales?.listings[0]?.currency ?? 'XOF';

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold">Seller hub</h1>
      <p className="mt-2 text-sm text-content-secondary">
        Keep 70% after processing fees · paid out automatically by Paystack to your bank or mobile
        money account · quality review before publish. Add your{' '}
        <Link href="/seller/payouts" className="text-primary">
          payout account
        </Link>{' '}
        before listing.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { href: '/seller/listings/new', label: 'New listing' },
          { href: '/seller/analytics', label: 'Analytics' },
          { href: '/seller/payouts', label: 'Payouts' },
        ].map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-xl border border-border p-4 font-medium hover:border-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10" data-testid="seller-listings">
        <h2 className="text-xl font-semibold">Your templates</h2>
        {loading ? <p className="mt-3 text-sm">Loading…</p> : null}
        {error ? (
          <p className="mt-3 text-sm text-error" role="alert">
            {error}. Apply as seller first if needed.
          </p>
        ) : null}
        {sales ? (
          <>
            <p className="mt-2 text-sm text-content-secondary">
              Revenue {formatListingPrice(sales.revenueCents, salesCurrency)} · Your share{' '}
              {formatListingPrice(sales.sellerShareCents, salesCurrency)}
            </p>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2">Name</th>
                  <th>Status</th>
                  <th>Sales</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sales.listings.map((t) => {
                  const revenue = t.purchases.reduce((s, p) => s + p.amountCents, 0);
                  return (
                    <tr key={t.id} className="border-b border-border">
                      <td className="py-2">{t.title}</td>
                      <td>{t.status}</td>
                      <td>{t.purchases.length}</td>
                      <td>{formatListingPrice(revenue, t.currency)}</td>
                    </tr>
                  );
                })}
                {sales.listings.length === 0 ? (
                  <tr>
                    <td className="py-4 text-content-secondary" colSpan={4}>
                      No listings yet.{' '}
                      <Link href="/seller/listings/new" className="text-primary">
                        Upload a template
                      </Link>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        ) : null}
      </section>
    </div>
  );
}
