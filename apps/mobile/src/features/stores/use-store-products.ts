import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

export const STORE_PRODUCTS_PAGE = 20;

/** GET /v1/products?storeSlug= with cursor pagination. */
export function useStoreProducts(slug: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.storeProducts(slug),
    queryFn: ({ pageParam }) =>
      api.listProducts({ storeSlug: slug, limit: STORE_PRODUCTS_PAGE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: enabled && slug.length > 0,
  });
}
