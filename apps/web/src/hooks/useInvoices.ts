'use client';

import { useQuery } from '@tanstack/react-query';
import { invoicesApi, queryKeys, type InvoiceListItem } from '@/lib/api';

export function useInvoices(enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: async (): Promise<InvoiceListItem[]> => {
      const res = await invoicesApi.list();
      return res.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
