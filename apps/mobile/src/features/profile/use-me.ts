import type { Me } from '@nexa/api-contract';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/stores/auth-store';

/** Stores exactly what the server returned in both the auth store and the query cache. */
export function applyMe(me: Me) {
  useAuthStore.getState().setUser(me);
  queryClient.setQueryData(queryKeys.me, me);
}

/** GET /v1/me, seeded from the cached profile so screens render instantly (and offline). */
export function useMe() {
  const cached = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const me = await api.getMe();
      useAuthStore.getState().setUser(me);
      return me;
    },
    initialData: cached ?? undefined,
    initialDataUpdatedAt: 0, // always revalidate on mount
  });
}
