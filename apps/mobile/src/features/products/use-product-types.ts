import type { ProductTypeDef } from '@nexa/api-contract';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

/** GET /v1/product-types: the catalogue of digital types (data, never hard-coded). */
export function useProductTypes() {
  return useQuery({
    queryKey: queryKeys.productTypes,
    queryFn: async () => (await api.listProductTypes()).data,
    staleTime: 60 * 60_000,
  });
}

export function typeOf(types: ProductTypeDef[] | undefined, code: string) {
  return types?.find((t) => t.code === code);
}
