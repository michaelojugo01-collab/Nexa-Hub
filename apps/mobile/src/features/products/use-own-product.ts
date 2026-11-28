import type { OwnProduct } from '@nexa/api-contract';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';

const busy = (p: OwnProduct | undefined) =>
  !!p?.assets.some((a) => a.status === 'scanning' || a.status === 'processing');

/** GET /v1/products/{id}. Polls every 2 s while a file is being scanned or processed. */
export function useOwnProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.ownProduct(id),
    queryFn: () => api.getOwnProduct(id),
    enabled: !!id,
    refetchInterval: (q) => (busy(q.state.data) ? 2000 : false),
  });
}

/** Write a server answer into the cache and refresh the seller's lists. */
export function applyOwnProduct(product: OwnProduct) {
  queryClient.setQueryData(queryKeys.ownProduct(product.id), product);
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.myProducts, 'list'] });
}
