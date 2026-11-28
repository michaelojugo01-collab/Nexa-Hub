import { create } from 'zustand';

import { secureStorage, type LockMode } from '@/lib/auth/secure-storage';
import { config } from '@/lib/config';

export const MAX_PIN_ATTEMPTS = 5;

type LockState = {
  mode: LockMode;
  locked: boolean;
  failures: number;
  backgroundedAt: number | null;
  /** Load settings at launch. A cold start counts as reopening, so it locks if enabled. */
  load: () => Promise<void>;
  setMode: (mode: LockMode, pin?: string) => Promise<void>;
  onBackground: (now?: number) => void;
  onForeground: (now?: number) => void;
  unlock: () => Promise<void>;
  /** Records a wrong PIN; returns attempts left. */
  recordFailure: () => Promise<number>;
  reset: () => void;
};

export const useLockStore = create<LockState>((set, get) => ({
  mode: 'off',
  locked: false,
  failures: 0,
  backgroundedAt: null,

  load: async () => {
    const { mode, failures } = await secureStorage.getLock();
    set({ mode, failures, locked: mode !== 'off' });
  },

  setMode: async (mode, pin) => {
    await secureStorage.setLock(mode, pin);
    set({ mode, failures: 0, locked: false });
  },

  onBackground: (now = Date.now()) => {
    if (get().backgroundedAt === null) set({ backgroundedAt: now });
  },

  onForeground: (now = Date.now()) => {
    const { mode, backgroundedAt } = get();
    const away = backgroundedAt === null ? 0 : now - backgroundedAt;
    set({
      backgroundedAt: null,
      locked: get().locked || (mode !== 'off' && away > config.appLockAfterSec * 1000),
    });
  },

  unlock: async () => {
    set({ locked: false, failures: 0 });
    await secureStorage.setLockFailures(0);
  },

  recordFailure: async () => {
    const failures = get().failures + 1;
    set({ failures });
    await secureStorage.setLockFailures(failures);
    return Math.max(0, MAX_PIN_ATTEMPTS - failures);
  },

  reset: () => set({ mode: 'off', locked: false, failures: 0, backgroundedAt: null }),
}));
