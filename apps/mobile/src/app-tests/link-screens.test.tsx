import { router as appRouter } from 'expo-router';
import { act, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { mockServer } from '@/lib/api/client';
import { mapIncomingLink } from '@/lib/incoming-link';
import { useAuthStore } from '@/stores/auth-store';
import { resetAppState } from '@/test/session-helpers';

jest.mock('@/lib/config', () => require('@/test/mock-config'));
jest.setTimeout(30_000);

/** Opens a web link the way the app does: map it, then navigate. */
async function openLink(url: string) {
  const rendered = await renderRouter('./src/app', { initialUrl: '/' });
  await waitFor(() => expect(useAuthStore.getState().status).not.toBe('restoring'));
  await act(async () => appRouter.push(mapIncomingLink(url) as never));
  return rendered;
}

describe('screens opened from web links', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
  });
  afterEach(async () => {
    await act(async () => {});
  });

  it('opens a store link on the store screen', async () => {
    const router = await openLink('https://nexahub.app/jollofacademy');
    expect(await screen.findByTestId('store-header')).toHaveTextContent(/Jollof Academy/);
    expect(router.getPathname()).toBe('/store/jollofacademy');
  });

  it('opens a product link on the (placeholder) product screen', async () => {
    const router = await openLink(
      'https://nexahub.app/adaezeprints/ankara-print-pattern-pack-40-designs',
    );
    expect(await screen.findByText('Ankara Print Pattern Pack (40 designs)')).toBeOnTheScreen();
    expect(screen.getByText('₦4,500')).toBeOnTheScreen();
    expect(screen.getByTestId('product-visit-store')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/product/adaezeprints/ankara-print-pattern-pack-40-designs');
  });

  it('shows not found for an unpublished product', async () => {
    await openLink('https://nexahub.app/adaezeprints/asoke-pattern-pack-coming-soon');
    expect(await screen.findByTestId('product-not-found')).toBeOnTheScreen();
  });

  it('opens an @username link on the (placeholder) profile screen', async () => {
    const router = await openLink('https://nexahub.app/@tunde');
    expect(await screen.findByText('Tunde Bakare')).toBeOnTheScreen();
    expect(screen.getByTestId('user-visit-store')).toHaveTextContent(/StudySmart Abuja/);
    expect(router.getPathname()).toBe('/user/tunde');
  });

  it('opens Home (Welcome when signed out) for unknown links', async () => {
    await openLink('https://nexahub.app/sitemap.xml');
    expect(await screen.findByTestId('welcome-get-started')).toBeOnTheScreen();
  });
});
