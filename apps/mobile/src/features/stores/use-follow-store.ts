import type { Store } from '@nexa/api-contract';
import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { toast } from '@/stores/toast-store';

type Vars = { storeId: string; follow: boolean };

/**
 * Follow / unfollow with an optimistic update on the cached store, rolled back on error.
 * The server's answer (following + followerCount) then replaces the guess.
 */
export function useFollowStore(slug: string) {
  const key = queryKeys.store(slug);
  return useMutation({
    mutationFn: ({ storeId, follow }: Vars) =>
      follow ? api.followStore(storeId) : api.unfollowStore(storeId),
    onMutate: async ({ follow }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Store>(key);
      if (previous) {
        queryClient.setQueryData<Store>(key, {
          ...previous,
          isFollowing: follow,
          followerCount: Math.max(0, previous.followerCount + (follow ? 1 : -1)),
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.show(
        isOfflineError(error)
          ? 'You’re offline. Try again when you’re connected.'
          : errorMessage(error, 'Couldn’t update. Please try again.'),
        'error',
      );
    },
    onSuccess: (state) => {
      queryClient.setQueryData<Store>(key, (current) =>
        current
          ? { ...current, isFollowing: state.following, followerCount: state.followerCount }
          : current,
      );
    },
  });
}
