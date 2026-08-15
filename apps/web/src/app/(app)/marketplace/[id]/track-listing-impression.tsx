'use client';

import { useEffect } from 'react';
import { marketplaceApi } from '@/lib/api';

/** Fire-and-forget listing GET so impressionCount increments. Renders nothing. */
export function TrackListingImpression({ listingId }: { listingId: string }) {
  useEffect(() => {
    void marketplaceApi.getListing(listingId).catch(() => undefined);
  }, [listingId]);
  return null;
}
