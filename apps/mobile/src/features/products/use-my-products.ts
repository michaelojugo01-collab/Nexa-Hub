import type { ProductState } from '@nexa/api-contract';
import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

export type ProductTab = Extract<ProductState, 'live' | 'draft' | 'unpublished'>;

/** GET /v1/products?owner=me&state=: the seller's products, 20 per page. */
export function useMyProducts(state: ProductTab, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.myProductList(state),
    queryFn: ({ pageParam }) => api.listMyProducts({ state, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}
