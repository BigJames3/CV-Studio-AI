'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { marketplaceApi } from '@/lib/api';

export default function NewListingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    void marketplaceApi.listMyTemplates().then((res) => {
      setTemplates(res.items.map((t) => ({ id: t.id, name: t.name })));
    });
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const price = Number(form.get('price') ?? 12.99);
    const description = String(form.get('description') ?? '').trim();
    const templateId = String(form.get('templateId') ?? '');
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `listing-${Date.now()}`;

    try {
      await marketplaceApi.createListing({
        templateId,
        title,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: description || undefined,
        priceCents: Math.round(price * 100),
      });
      router.push('/seller');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold">Upload template</h1>
      <p className="mt-2 text-sm text-content-secondary">
        Price $4.99–$49.99 · submit for quality review (≤72h).
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit} data-testid="seller-new-listing-form">
        <label className="block text-sm font-medium">
          Catalog template
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            name="templateId"
            required
            data-testid="seller-template-id"
          >
            <option value="">Select template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Title
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            name="title"
            required
            data-testid="seller-listing-title"
          />
        </label>
        <label className="block text-sm font-medium">
          Price (USD)
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            name="price"
            type="number"
            min={4.99}
            max={49.99}
            step={0.5}
            defaultValue={12.99}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2"
            name="description"
            rows={4}
          />
        </label>
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          data-testid="seller-listing-submit"
        >
          {pending ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  );
}
