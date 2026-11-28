import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { toast } from '@/stores/toast-store';

import { applyMe } from './use-me';

/**
 * POST /v1/me/seller. The app never adds the role itself: it shows the user the server
 * returns, in the store and the query cache, so every screen updates without re-login.
 */
export function useBecomeSeller() {
  return useMutation({
    mutationFn: () => api.becomeSeller(),
    onSuccess: (me) => {
      applyMe(me);
      toast.show('You’re now a seller. Set up your store next.', 'success');
    },
    onError: (error) =>
      toast.show(
        isOfflineError(error)
          ? 'You’re offline. Try again when you’re connected.'
          : errorMessage(error),
        'error',
      ),
  });
}
