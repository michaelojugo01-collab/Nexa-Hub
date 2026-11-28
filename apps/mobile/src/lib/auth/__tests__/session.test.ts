import { api, mockServer, publicApi } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { logout, restoreSession } from '@/lib/auth/session';
import { useMockControl } from '@/mocks/mock-control';
import { useAuthStore } from '@/stores/auth-store';
import { keychainValue, resetAppState, signInAs } from '@/test/session-helpers';

jest.mock('@/lib/config', () => require('@/test/mock-config'));

const BUYER = '+2348055550000';
const NOW = Date.parse('2026-11-28T10:00:00Z');

/** Moves the clock past the 30-second access token TTL. */
function expireAccessToken() {
  jest.setSystemTime(Date.now() + 31_000);
}

describe('session: tokens, silent refresh, restore and logout', () => {
  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout'] });
    jest.setSystemTime(NOW);
    await resetAppState();
    await mockServer!.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores tokens in secure storage after sign-in', async () => {
    const session = await signInAs(BUYER);
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(keychainValue('nexa.auth.refreshToken')).toBe(session.refreshToken);
    expect(keychainValue('nexa.auth.accessToken')).toBe(session.accessToken);
  });

  it('expired token → silent refresh → original request retried', async () => {
    const session = await signInAs(BUYER);
    const refreshSpy = jest.spyOn(publicApi, 'refreshSession');
    expireAccessToken();

    const me = await api.getMe();

    expect(me.phone).toBe(BUYER);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    const state = useAuthStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.refreshToken).not.toBe(session.refreshToken); // rotated
    expect(keychainValue('nexa.auth.refreshToken')).toBe(state.refreshToken);
    refreshSpy.mockRestore();
  });

  it('shares one refresh between concurrent requests', async () => {
    await signInAs(BUYER);
    const refreshSpy = jest.spyOn(publicApi, 'refreshSession');
    expireAccessToken();

    const results = await Promise.all([api.getMe(), api.getMe(), api.getDataExport()]);

    expect(results).toHaveLength(3);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    refreshSpy.mockRestore();
  });

  it('failed refresh → signed out and everything cleared', async () => {
    await signInAs(BUYER);
    queryClient.setQueryData(['something'], 'cached');
    useAuthStore.setState({ refreshToken: 'rt_revoked' });
    expireAccessToken();

    await expect(api.getMe()).rejects.toMatchObject({ status: 401 });
    // sign-out runs asynchronously after the failed refresh
    await new Promise((r) => setTimeout(r, 0));

    const state = useAuthStore.getState();
    expect(state.status).toBe('signedOut');
    expect(state.lastSignOutReason).toBe('expired');
    expect(state.accessToken).toBeNull();
    expect(keychainValue('nexa.auth.refreshToken')).toBeUndefined();
    expect(queryClient.getQueryData(['something'])).toBeUndefined();
  });

  it('keeps the session when the refresh fails only because the network is down', async () => {
    await signInAs(BUYER);
    expireAccessToken();
    useMockControl.setState({ offline: true });

    await expect(api.getMe()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(useAuthStore.getState().status).toBe('signedIn');

    useMockControl.setState({ offline: false });
    await expect(api.getMe()).resolves.toMatchObject({ phone: BUYER });
  });

  it('restarting the app keeps the user signed in', async () => {
    const session = await signInAs(BUYER);
    // Simulate a cold start: memory is gone, secure storage remains.
    useAuthStore.setState({
      status: 'restoring',
      user: null,
      accessToken: null,
      refreshToken: null,
    });

    await restoreSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.user?.id).toBe(session.user.id);
    expect(state.refreshToken).toBe(session.refreshToken);
  });

  it('restarting with nothing stored shows the signed-out app', async () => {
    useAuthStore.setState({ status: 'restoring' });
    await restoreSession();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('logout clears memory, secure storage and the cache, and revokes the refresh token', async () => {
    const session = await signInAs(BUYER);
    queryClient.setQueryData(['something'], 'cached');

    await logout();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'signedOut',
      user: null,
      accessToken: null,
    });
    for (const key of ['accessToken', 'refreshToken', 'user']) {
      expect(keychainValue(`nexa.auth.${key}`)).toBeUndefined();
    }
    expect(queryClient.getQueryData(['something'])).toBeUndefined();
    await expect(
      publicApi.refreshSession({ refreshToken: session.refreshToken, deviceId: 'any' }),
    ).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' });
  });
});
