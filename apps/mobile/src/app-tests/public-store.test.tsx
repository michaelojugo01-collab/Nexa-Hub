import { ApiError } from '@nexa/api-contract';
import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { useReturnTo } from '@/features/stores/return-to';
import { api, mockServer } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { useFlagOverrides } from '@/lib/flags';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { resetAppState, signInAs } from '@/test/session-helpers';

jest.mock('@/lib/config', () => require('@/test/mock-config'));
jest.setTimeout(30_000);

const ADAEZE = '+2348031234567';
const CHIDI = '+2348055550000';

/** Renders the real app and opens a URL, like a deep link (nexahub://store/{slug}). */
async function open(url: string) {
  const rendered = await renderRouter('./src/app', { initialUrl: '/' });
  await waitFor(() => expect(useAuthStore.getState().status).not.toBe('restoring'));
  await act(async () => appRouter.push(url as never));
  return rendered;
}

describe('public store screen', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
    useReturnTo.setState({ path: null });
    useFlagOverrides.setState({ overrides: {} });
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await act(async () => {});
  });

  it('shows a store to signed-out visitors, with products and About', async () => {
    await open('/store/jollofacademy');
    expect(await screen.findByTestId('store-header')).toHaveTextContent(/Jollof Academy/);
    expect(screen.getByTestId('store-category')).toHaveTextContent('Food & cooking');
    expect(await screen.findByText('Party Jollof Masterclass')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('store-tab-about'));
    expect(await screen.findByTestId('store-about')).toHaveTextContent(
      /Member since\s*August 2026/,
    );
  });

  it('replaces an old slug with the new one', async () => {
    const router = await open('/store/adaezestudio');
    expect(await screen.findByTestId('store-header')).toHaveTextContent(/Adaeze Prints/);
    await waitFor(() => expect(router.getPathname()).toBe('/store/adaezeprints'));
  });

  it('opens /{slug} links (future https links) on the store screen', async () => {
    const router = await open('/kolacreates');
    expect(await screen.findByTestId('store-header')).toHaveTextContent(/Kola Creates/);
    expect(router.getPathname()).toBe('/store/kolacreates');
  });

  it('shows "This store is private" for a private store', async () => {
    await open('/store/lensbyemeka');
    expect(await screen.findByTestId('store-private')).toHaveTextContent(/This store is private/);
  });

  it('shows not found for an unknown slug', async () => {
    await open('/store/no-such-store');
    expect(await screen.findByTestId('store-not-found')).toHaveTextContent(/Store not found/);
  });

  it('hides the Services tab unless its flag is on', async () => {
    await open('/store/kolacreates');
    await screen.findByTestId('store-header');
    expect(screen.queryByTestId('store-tab-services')).not.toBeOnTheScreen();
    await act(async () => useFlagOverrides.getState().setOverride('servicesTab', true));
    expect(await screen.findByTestId('store-tab-services')).toBeOnTheScreen();
  });

  it('shows Edit store instead of Follow to the owner, and hides it when viewing as a buyer', async () => {
    await signInAs(ADAEZE);
    await open('/store/adaezeprints');
    expect(await screen.findByTestId('store-edit')).toBeOnTheScreen();
    expect(screen.queryByTestId('store-header-follow')).not.toBeOnTheScreen();

    await act(async () =>
      appRouter.push({ pathname: '/store/[slug]', params: { slug: 'adaezeprints', as: 'buyer' } }),
    );
    expect(await screen.findByTestId('store-viewing-as-buyer')).toBeOnTheScreen();
    expect(screen.queryByTestId('store-edit')).not.toBeOnTheScreen();
  });

  it('sends signed-out visitors to sign in from Follow, remembering the store', async () => {
    const router = await open('/store/kolacreates');
    await fireEvent.press(await screen.findByTestId('store-header-follow'));
    expect(await screen.findByTestId('welcome-get-started')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/welcome');
    expect(useReturnTo.getState().path).toBe('/store/kolacreates');
  });
});

describe('follow button', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
    jest.restoreAllMocks();
    useReturnTo.setState({ path: null });
    await signInAs(CHIDI);
  });

  afterEach(async () => {
    await act(async () => {});
  });

  it('rolls back when the server refuses', async () => {
    let reject!: (error: unknown) => void;
    jest
      .spyOn(api, 'followStore')
      .mockImplementationOnce(() => new Promise((_resolve, r) => (reject = r)));
    await open('/store/kolacreates');
    await fireEvent.press(await screen.findByTestId('store-header-follow'));
    // Optimistic: shown before the server answers.
    await waitFor(() =>
      expect(screen.getByTestId('store-header-follow')).toHaveTextContent('Following'),
    );

    await act(async () =>
      reject(
        new ApiError(500, { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('store-header-follow')).toHaveTextContent(/^Follow$/),
    );
    expect(useToastStore.getState().current).toMatchObject({
      variant: 'error',
      message: 'Something went wrong on our side.',
    });
  });

  it('updates instantly and survives clearing the query cache', async () => {
    await open('/store/kolacreates');
    const follow = await screen.findByTestId('store-header-follow');
    expect(follow).toHaveTextContent('Follow');
    await fireEvent.press(follow);
    await waitFor(() =>
      expect(screen.getByTestId('store-header-follow')).toHaveTextContent('Following'),
    );
    await waitFor(async () => expect((await api.getStore('kolacreates')).isFollowing).toBe(true));

    // Restart: unmount the app and throw away every cached query. The server says Following.
    screen.unmount();
    queryClient.clear();
    await open('/store/kolacreates');
    await waitFor(() =>
      expect(screen.getByTestId('store-header-follow')).toHaveTextContent('Following'),
    );
    expect(
      queryClient.getQueryData<{ isFollowing: boolean }>(['stores', 'kolacreates']),
    ).toMatchObject({
      isFollowing: true,
      followerCount: 2151,
    });

    // Unfollow
    await fireEvent.press(screen.getByTestId('store-header-follow'));
    await waitFor(() =>
      expect(screen.getByTestId('store-header-follow')).toHaveTextContent(/^Follow$/),
    );
    await waitFor(async () => expect((await api.getStore('kolacreates')).isFollowing).toBe(false));
  });
});
