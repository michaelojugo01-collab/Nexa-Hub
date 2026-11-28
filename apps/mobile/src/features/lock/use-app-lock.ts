import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { useLockStore } from '@/stores/lock-store';

/** Loads lock settings when signed in and re-locks after the app was away too long. */
export function useAppLock() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'signedIn') void useLockStore.getState().load();
    else useLockStore.getState().reset();
  }, [status]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const lock = useLockStore.getState();
      if (state === 'active') lock.onForeground();
      else lock.onBackground();
    });
    return () => sub.remove();
  }, []);
}
