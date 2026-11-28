import type { AuthSession } from '@nexa/api-contract';
import { isApiError } from '@nexa/api-contract';

import { api, publicApi } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuthStore } from '@/stores/auth-store';

import { secureStorage } from './secure-storage';
import { signOutLocally } from './sign-out';

/**
 * Runs once at launch. Signed-in users with a cached profile see the app immediately
 * (works offline); /v1/me then refreshes in the background.
 */
export async function restoreSession() {
  const store = useAuthStore.getState();
  const stored = await secureStorage.loadSession();
  const localAvatarUri = await secureStorage.getLocalAvatarUri();
  if (!stored) {
    store.setSignedOut();
    return;
  }
  const { user, ...tokens } = stored;

  if (user) {
    store.restore({ tokens, user });
    useAuthStore.setState({ localAvatarUri });
    void refreshMe();
    return;
  }

  // No cached profile: we must ask the server before choosing a screen.
  useAuthStore.setState({
    accessToken: tokens.accessToken || null,
    refreshToken: tokens.refreshToken,
  });
  try {
    const me = await api.getMe();
    store.restore({
      tokens: { ...tokens, accessToken: useAuthStore.getState().accessToken ?? '' },
      user: me,
    });
    useAuthStore.setState({ localAvatarUri });
    queryClient.setQueryData(queryKeys.me, me);
    void secureStorage.saveUser(me);
  } catch {
    // Refused → already signed out by the client. Offline with no cached profile → start over.
    if (useAuthStore.getState().status === 'restoring') await signOutLocally(null);
  }
}

/** Re-reads /v1/me and stores exactly what the server says. */
export async function refreshMe() {
  try {
    const me = await api.getMe();
    useAuthStore.getState().setUser(me);
    queryClient.setQueryData(queryKeys.me, me);
    return me;
  } catch (error) {
    if (isApiError(error) && !error.isNetworkError && error.status !== 401) throw error;
    return null;
  }
}

export async function startSession(session: AuthSession) {
  queryClient.clear();
  await useAuthStore.getState().startSession(session);
  queryClient.setQueryData(queryKeys.me, session.user);
}

/** Tells the server, then clears everything locally even if the server can't be reached. */
export async function logout() {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (refreshToken) await publicApi.logout({ refreshToken }).catch(() => undefined);
  await signOutLocally('logout');
}
