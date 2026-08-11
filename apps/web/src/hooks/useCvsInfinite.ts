'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { cvsApi, queryKeys, type ListCvsResponse } from '@/lib/api';

const PAGE_SIZE = 20;

/**
 * Infinite CV list — shares queryKeys.cvs() with mutations / useCvs compatibility layer.
 */
export function useCvsInfinite() {
  return useInfiniteQuery({
    queryKey: queryKeys.cvs(),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      cvsApi.list({
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage: ListCvsResponse) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
}
