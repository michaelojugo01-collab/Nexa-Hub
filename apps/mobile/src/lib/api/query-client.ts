import { isApiError } from '@nexa/api-contract';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { addNetworkStateListener } from 'expo-network';
import { AppState, Platform } from 'react-native';

const MAX_RETRIES = 2;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Retry only failures that can succeed later (network, timeout, 5xx, 429).
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES && (!isApiError(error) || error.isRetryable),
      },
    },
  });
}

/** The app's single QueryClient (cleared on sign-out). */
export const queryClient = createQueryClient();

let wired = false;

/** Connects TanStack Query to the device's network and app-foreground state. Call once. */
export function wireQueryManagers() {
  if (wired) return;
  wired = true;

  onlineManager.setEventListener((setOnline) => {
    const sub = addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => sub.remove();
  });

  if (Platform.OS !== 'web') {
    focusManager.setEventListener((setFocused) => {
      const sub = AppState.addEventListener('change', (status) => setFocused(status === 'active'));
      return () => sub.remove();
    });
  }
}
