import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

/** Interest tags come from the server's categories (bounded list, one page of 50). */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.listCategories({ limit: 50 })).data,
    staleTime: 60 * 60_000,
  });
}
