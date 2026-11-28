import { fireEvent, screen } from '@testing-library/react-native';

import { mockServer } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { renderWithProviders } from '@/test/render';
import { resetAppState, signInAs } from '@/test/session-helpers';

import { StoreTabScreen } from '@/features/profile/StoreTabScreen';

jest.mock('@/lib/config', () => require('@/test/mock-config'));
jest.mock('expo-router', () => require('@/test/mock-router'));

describe('Create/Store tab', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
  });

  it('shows "Start selling" to a buyer', async () => {
    await signInAs('+2348055550000');
    await renderWithProviders(<StoreTabScreen />, { queryClient });
    expect(await screen.findByTestId('store-buyer-state')).toBeOnTheScreen();
    expect(screen.queryByTestId('store-dashboard')).not.toBeOnTheScreen();
  });

  it('shows store setup to a seller without a store', async () => {
    await signInAs('+2348091112222'); // new user
    const { api } = require('@/lib/api/client') as typeof import('@/lib/api/client');
    const { applyMe } =
      require('@/features/profile/use-me') as typeof import('@/features/profile/use-me');
    applyMe(await api.becomeSeller());
    await renderWithProviders(<StoreTabScreen />, { queryClient });
    expect(await screen.findByTestId('store-setup-intro')).toBeOnTheScreen();

    const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } };
    await fireEvent.press(screen.getByTestId('store-setup-intro-action'));
    expect(router.push).toHaveBeenCalledWith('/seller/setup');
  });

  it('shows the dashboard to a seller with a store', async () => {
    await signInAs('+2348031234567'); // Adaeze
    await renderWithProviders(<StoreTabScreen />, { queryClient });
    expect(await screen.findByTestId('store-dashboard')).toBeOnTheScreen();
    expect(screen.getByText('Adaeze Prints')).toBeOnTheScreen();
    expect(screen.getByTestId('dashboard-stats')).toHaveTextContent(
      /12480\s*Followers\s*36\s*Products/,
    );
    expect(await screen.findByTestId('payout-reminder')).toBeOnTheScreen();
  });

  it('switches the store to private, with an explanation', async () => {
    await signInAs('+2348031234567');
    await renderWithProviders(<StoreTabScreen />, { queryClient });
    await screen.findByTestId('store-dashboard');
    await fireEvent(screen.getByTestId('dashboard-visibility'), 'valueChange', false);
    expect(await screen.findByText('Private')).toBeOnTheScreen();
    expect(screen.getByTestId('dashboard-visibility-help')).toHaveTextContent(
      /only you can see your store/,
    );
  });

  it('remembers a dismissed payout reminder', async () => {
    await signInAs('+2348031234567');
    const first = await renderWithProviders(<StoreTabScreen />, { queryClient });
    await fireEvent.press(await screen.findByTestId('payout-reminder-dismiss'));
    expect(screen.queryByTestId('payout-reminder')).not.toBeOnTheScreen();
    await first.unmount();
    await renderWithProviders(<StoreTabScreen />, { queryClient });
    await screen.findByTestId('store-dashboard');
    expect(screen.queryByTestId('payout-reminder')).not.toBeOnTheScreen();
  });

  it('shows the error state with retry when the store cannot load', async () => {
    await signInAs('+2348031234567');
    const { useMockControl } =
      require('@/mocks/mock-control') as typeof import('@/mocks/mock-control');
    useMockControl.setState({ offline: true });
    await renderWithProviders(<StoreTabScreen />, { queryClient });
    expect(await screen.findByTestId('store-error', {}, { timeout: 5000 })).toBeOnTheScreen();
    useMockControl.setState({ offline: false });
    await fireEvent.press(screen.getByTestId('store-error-retry'));
    expect(await screen.findByTestId('store-dashboard')).toBeOnTheScreen();
  });
});
