import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

/** GET /v1/stores/{slug}. Public; signed-in users also get `isFollowing` and `isOwner`. */
export function useStore(slug: string) {
  return useQuery({
    queryKey: queryKeys.store(slug),
    queryFn: () => api.getStore(slug),
    enabled: slug.length > 0,
  });
}
