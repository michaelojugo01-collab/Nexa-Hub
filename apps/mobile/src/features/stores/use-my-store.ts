import type { OwnStore } from '@nexa/api-contract';
import { isApiError } from '@nexa/api-contract';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { applyMe } from '@/features/profile/use-me';

/** GET /v1/me/store (proposed). `null` means the seller has not created a store yet. */
export function useMyStore(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myStore,
    queryFn: async (): Promise<OwnStore | null> => {
      try {
        return await api.getMyStore();
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    enabled,
  });
}

/**
 * After a store write: cache exactly what the server returned, drop stale public reads, and
 * re-read /v1/me (its `store` summary changed) so every screen agrees.
 */
export async function applyOwnStore(store: OwnStore) {
  queryClient.setQueryData(queryKeys.myStore, store);
  await queryClient.invalidateQueries({ queryKey: queryKeys.stores });
  try {
    applyMe(await api.getMe());
  } catch {
    // Not fatal: /v1/me is re-read on the next mount.
  }
}
