import { useNetworkState } from 'expo-network';

/** True unless the device reports it is offline. Unknown counts as online. */
export function useOnline() {
  const state = useNetworkState();
  return state.isConnected !== false && state.isInternetReachable !== false;
}
