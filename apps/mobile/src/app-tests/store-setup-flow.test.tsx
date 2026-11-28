import { ApiError } from '@nexa/api-contract';
import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { applyMe } from '@/features/profile/use-me';
import { api, mockServer } from '@/lib/api/client';
import { resetAppState, signInAs } from '@/test/session-helpers';

jest.mock('@/lib/config', () => require('@/test/mock-config'));
jest.setTimeout(30_000);

async function newSellerOnSetup() {
  await signInAs('+2348091112222');
  applyMe(await api.updateMe({ displayName: 'Bisi Ade', username: 'bisi_ade' }));
  applyMe(await api.becomeSeller());
  const rendered = await renderRouter('./src/app', { initialUrl: '/' });
  await screen.findByTestId('home-screen', {}, { timeout: 10_000 }); // session restored
  await act(async () => appRouter.push('/seller/setup'));
  return rendered;
}

async function fillStepTwoAndSkipPhotos() {
  await fireEvent.press(await screen.findByTestId('setup-category-food'));
  await fireEvent.changeText(
    screen.getByTestId('setup-bio-field'),
    'Small chops and cakes in Surulere.',
  );
  await fireEvent.press(screen.getByTestId('setup-next'));
  await screen.findByTestId('setup-step-photos', {}, { timeout: 10_000 });
  await fireEvent.press(screen.getByText('Skip for now'));
  await screen.findByTestId('setup-step-review', {}, { timeout: 10_000 });
}

describe('store setup flow', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
  });

  it('publishes a store: name → suggested link → category and bio → skip photos → publish', async () => {
    const router = await newSellerOnSetup();

    expect(await screen.findByTestId('setup-step-label')).toHaveTextContent(
      'Step 1 of 4 · Name and link',
    );
    await fireEvent.changeText(
      await screen.findByTestId('setup-name-field'),
      'Bìsí Bakes & Chops 🎂',
    );
    expect(screen.getByTestId('setup-slug-field').props.value).toBe('bisi-bakes-and-chops');
    expect(await screen.findByText('✓ Available', {}, { timeout: 10_000 })).toBeOnTheScreen();
    expect(screen.getByTestId('setup-link-preview')).toHaveTextContent(
      /nexahub\.app\/bisi-bakes-and-chops$/,
    );
    await fireEvent.press(screen.getByTestId('setup-next'));

    expect(await screen.findByTestId('setup-step-label')).toHaveTextContent(/Step 2 of 4/);
    await fireEvent.press(screen.getByTestId('setup-next')); // no category yet
    expect(await screen.findByText('Choose a category')).toBeOnTheScreen();
    await fillStepTwoAndSkipPhotos();

    expect(screen.getByTestId('setup-preview')).toHaveTextContent(/Bìsí Bakes & Chops/);
    await fireEvent.press(screen.getByTestId('setup-publish'));

    expect(await screen.findByTestId('store-published', {}, { timeout: 10_000 })).toBeOnTheScreen();
    expect(screen.getByTestId('store-published-link')).toHaveTextContent(
      /nexahub\.app\/bisi-bakes-and-chops$/,
    );
    expect(router.getPathname()).toBe('/seller/published');

    const store = await api.getMyStore();
    expect(store).toMatchObject({
      name: 'Bìsí Bakes & Chops 🎂',
      slug: 'bisi-bakes-and-chops',
      category: { slug: 'food' },
      bio: 'Small chops and cakes in Surulere.',
      visibility: 'public',
    });
    await act(async () => {});
  });

  it('blocks a taken link, and sends you back to it if it is taken before publishing', async () => {
    await newSellerOnSetup();

    await fireEvent.changeText(await screen.findByTestId('setup-name-field'), 'Kola Creates');
    await fireEvent.changeText(screen.getByTestId('setup-slug-field'), 'kolacreates');
    expect(
      await screen.findByText('That link is taken. Try another.', {}, { timeout: 10_000 }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('setup-next')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('setup-slug-field'), 'admin');
    expect(
      await screen.findByText('That link is reserved. Try another.', {}, { timeout: 10_000 }),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('setup-slug-field'), 'kola-designs');
    expect(await screen.findByText('✓ Available', {}, { timeout: 10_000 })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('setup-next'));
    await fillStepTwoAndSkipPhotos();

    // Someone else publishes "kola-designs" while this seller is on the review step.
    jest.spyOn(api, 'createStore').mockRejectedValueOnce(
      new ApiError(409, {
        code: 'SLUG_TAKEN',
        message: 'That link is already taken. Try another.',
      }),
    );
    await fireEvent.press(screen.getByTestId('setup-publish'));

    expect(await screen.findByTestId('setup-step-name')).toBeOnTheScreen();
    expect(screen.getByText('That link is already taken. Try another.')).toBeOnTheScreen();
    expect(screen.getByTestId('setup-next')).toBeDisabled();

    // A new link clears the error and the seller can carry on.
    await fireEvent.changeText(screen.getByTestId('setup-slug-field'), 'kola-designs-ng');
    await waitFor(() => expect(screen.getByTestId('setup-next')).not.toBeDisabled(), {
      timeout: 3000,
    });
    await act(async () => {});
  });
});
