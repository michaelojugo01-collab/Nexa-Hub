import { fireEvent, screen } from '@testing-library/react-native';

import { mockServer } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { renderWithProviders } from '@/test/render';
import { resetAppState, signInAs } from '@/test/session-helpers';

import { ProfileScreen } from '../ProfileScreen';
import { StoreTabScreen } from '../StoreTabScreen';

jest.mock('@/lib/config', () => require('@/test/mock-config'));
jest.mock('expo-router', () => require('@/test/mock-router'));

describe('Become a seller', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
  });

  it('upgrades a buyer and updates Profile and the Store tab without signing out', async () => {
    const session = await signInAs('+2348055550000'); // returning buyer
    await renderWithProviders(
      <>
        <ProfileScreen />
        <StoreTabScreen />
      </>,
      { queryClient },
    );

    expect(await screen.findByTestId('profile-role-buyer')).toBeOnTheScreen();
    expect(screen.getByTestId('store-buyer-state')).toBeOnTheScreen();

    await fireEvent(screen.getByTestId('profile-seller-switch'), 'valueChange', true);
    await fireEvent.press(await screen.findByTestId('become-seller-confirm'));

    expect(await screen.findByTestId('profile-role-seller')).toBeOnTheScreen();
    expect(await screen.findByTestId('store-seller-state')).toBeOnTheScreen();
    expect(screen.queryByTestId('store-buyer-state')).not.toBeOnTheScreen();

    // Same session: no re-login, tokens untouched, role came from the server response.
    const state = useAuthStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.accessToken).toBe(session.accessToken);
    expect(state.user?.roles).toEqual(['buyer', 'seller']);
  });
});
