'use client';

import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * Counts one visit from the visitor's browser: the page itself is cached server-side, so
 * the API cannot count views there. Once per tab session; failures are ignored.
 */
export function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `cv-view-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* private mode: the server-side dedup still applies */
    }
    const src = new URLSearchParams(window.location.search).get('src') ?? undefined;
    void fetch(`${API_URL}/public/cvs/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ src, referrer: document.referrer || undefined }),
      keepalive: true,
    }).catch(() => undefined);
  }, [slug]);

  return null;
}
