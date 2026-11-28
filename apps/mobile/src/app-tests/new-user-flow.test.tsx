import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { mockServer } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { resetAppState } from '@/test/session-helpers';

jest.mock('@/lib/config', () => require('@/test/mock-config'));

/**
 * The real app: root layout, route guards, screens and the mock backend.
 * New user: Welcome → phone → code → email (skip) → name + username → photo (skip) →
 * interests → Home.
 */
describe('new user flow', () => {
  beforeEach(async () => {
    await resetAppState();
    useAuthStore.setState({ status: 'restoring' });
    await mockServer!.reset();
  });

  it('goes from Welcome to a verified account on Home', async () => {
    const router = await renderRouter('./src/app', { initialUrl: '/' });

    await fireEvent.press(await screen.findByTestId('welcome-get-started'));
    await fireEvent.changeText(await screen.findByTestId('phone-input-field'), '0809 111 2222');
    await fireEvent.press(screen.getByTestId('phone-submit'));

    await fireEvent.changeText(await screen.findByTestId('otp-input'), '123456');

    await fireEvent.press(await screen.findByTestId('add-email-skip'));

    await fireEvent.changeText(
      await screen.findByTestId('display-name-input-field'),
      'Chidi Nwosu',
    );
    await fireEvent.changeText(screen.getByTestId('username-input-field'), 'chidi_n');
    expect(await screen.findByText('✓ Available', {}, { timeout: 3000 })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('username-submit'));

    await fireEvent.press(await screen.findByTestId('photo-secondary')); // skip photo

    await fireEvent.press(await screen.findByTestId('interest-tech'));
    await fireEvent.press(screen.getByTestId('interest-education'));
    await fireEvent.press(screen.getByTestId('interests-submit'));

    expect(await screen.findByTestId('home-screen', {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/');

    const { user, status } = useAuthStore.getState();
    expect(status).toBe('signedIn');
    expect(user).toMatchObject({
      phone: '+2348091112222',
      username: 'chidi_n',
      displayName: 'Chidi Nwosu',
      interests: ['tech', 'education'],
      roles: ['buyer'],
    });
    await act(async () => {});
  });

  it('sends a returning user straight from the code to Home', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });

    await fireEvent.press(await screen.findByTestId('welcome-sign-in'));
    await fireEvent.changeText(await screen.findByTestId('phone-input-field'), '08031234567');
    await fireEvent.press(screen.getByTestId('phone-submit'));
    await fireEvent.changeText(await screen.findByTestId('otp-input'), '123456');

    expect(await screen.findByTestId('home-screen', {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(useAuthStore.getState().user?.username).toBe('adaeze');
  });
});
