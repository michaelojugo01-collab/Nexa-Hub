import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

/** GET /v1/users/{username} (proposed, F3). */
export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.publicProfile(username),
    queryFn: () => api.getPublicProfile(username),
    enabled: !!username,
  });
}
