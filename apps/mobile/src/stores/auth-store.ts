import type { AuthSession, Me, TokenPair } from '@nexa/api-contract';
import { create } from 'zustand';

import { secureStorage } from '@/lib/auth/secure-storage';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

export type SignOutReason = 'logout' | 'expired' | 'deleted' | 'locked';

type AuthState = {
  status: AuthStatus;
  /** Exactly what /v1/me last returned. The app never edits roles itself. */
  user: Me | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** True while a new user is going through onboarding (UI flow only, not access). */
  onboarding: boolean;
  /** Why the last session ended, for a one-off message on the Welcome screen. */
  lastSignOutReason: SignOutReason | null;
  /** Photo picked on this device; upload comes in a later module. */
  localAvatarUri: string | null;

  startSession: (session: AuthSession) => Promise<void>;
  restore: (stored: { tokens: TokenPair; user: Me | null }) => void;
  setTokens: (tokens: TokenPair) => Promise<void>;
  setUser: (user: Me) => void;
  setLocalAvatarUri: (uri: string | null) => Promise<void>;
  finishOnboarding: () => void;
  /** Local sign-out: clears memory and secure storage. Callers also clear the query cache. */
  clear: (reason: SignOutReason | null) => Promise<void>;
  setSignedOut: () => void;
};

const empty = {
  user: null,
  accessToken: null,
  refreshToken: null,
  onboarding: false,
  localAvatarUri: null,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'restoring',
  lastSignOutReason: null,
  ...empty,

  startSession: async (session) => {
    const { user, isNewUser, ...tokens } = session;
    await secureStorage.saveTokens(tokens);
    await secureStorage.saveUser(user);
    set({
      status: 'signedIn',
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      onboarding: isNewUser || !user.username,
      lastSignOutReason: null,
    });
  },

  restore: ({ tokens, user }) =>
    set({
      status: 'signedIn',
      user,
      accessToken: tokens.accessToken || null,
      refreshToken: tokens.refreshToken,
      onboarding: user ? !user.username : false,
    }),

  setTokens: async (tokens) => {
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    await secureStorage.saveTokens(tokens);
  },

  setUser: (user) => {
    set({ user, onboarding: get().onboarding || !user.username });
    void secureStorage.saveUser(user);
  },

  setLocalAvatarUri: async (uri) => {
    set({ localAvatarUri: uri });
    await secureStorage.setLocalAvatarUri(uri);
  },

  finishOnboarding: () => set({ onboarding: false }),

  clear: async (reason) => {
    set({ ...empty, status: 'signedOut', lastSignOutReason: reason });
    await secureStorage.clearSession();
  },

  setSignedOut: () => set({ status: 'signedOut' }),
}));
