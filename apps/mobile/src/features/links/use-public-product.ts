import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

/** GET /v1/stores/{store}/products/{product} (proposed, F3). */
export function usePublicProduct(store: string, product: string) {
  return useQuery({
    queryKey: queryKeys.publicProduct(store, product),
    queryFn: () => api.getPublicProduct(store, product),
    enabled: !!store && !!product,
  });
}
