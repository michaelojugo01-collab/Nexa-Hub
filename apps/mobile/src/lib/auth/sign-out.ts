import { queryClient } from '@/lib/api/query-client';
import { useAuthStore, type SignOutReason } from '@/stores/auth-store';

/** Clears every trace of the session on this device: memory, secure storage, query cache. */
export async function signOutLocally(reason: SignOutReason | null) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await useAuthStore.getState().clear(reason);
}
