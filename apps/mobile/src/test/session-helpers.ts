import { publicApi } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { secureStorage } from '@/lib/auth/secure-storage';
import { startSession } from '@/lib/auth/session';
import { MOCK_OTP_CODE } from '@nexa/mocks';
import { useMockControl } from '@/mocks/mock-control';
import { useAuthStore } from '@/stores/auth-store';

/** Signs in through the real client and mock server, exactly like the code screen does. */
export async function signInAs(phone: string) {
  const { challengeId } = await publicApi.requestOtp({ phone, channel: 'sms' });
  const session = await publicApi.verifyOtp({
    challengeId,
    code: MOCK_OTP_CODE,
    deviceId: await secureStorage.getDeviceId(),
  });
  await startSession(session);
  return session;
}

/** Clears app state between tests (the mock server keeps its own state per test file). */
export async function resetAppState() {
  const { __keychain } = require('@/lib/auth/keychain') as { __keychain: Map<string, string> };
  __keychain.clear();
  queryClient.clear();
  useMockControl.setState({
    smsDown: false,
    rateLimited: false,
    offline: false,
    uploadsFail: false,
  });
  useAuthStore.setState({
    status: 'signedOut',
    user: null,
    accessToken: null,
    refreshToken: null,
    onboarding: false,
    lastSignOutReason: null,
    localAvatarUri: null,
  });
}

export function keychainValue(key: string) {
  const { __keychain } = require('@/lib/auth/keychain') as { __keychain: Map<string, string> };
  return __keychain.get(key);
}
