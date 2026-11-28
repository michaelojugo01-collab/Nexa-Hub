import { createApiClient } from '@nexa/api-contract';
import { fireEvent, screen } from '@testing-library/react-native';

import { createMockFetch, discoverHome, type MockFetchOptions } from '@nexa/mocks';
import { renderWithProviders } from '@/test/render';

import { HomeScreen } from '../HomeScreen';

// Route the app's API client through the mock layer, configured per test.
const mockApi: { getDiscoverHome: () => Promise<unknown> } = {
  getDiscoverHome: () => Promise.reject(new Error('not configured')),
};
jest.mock('@/lib/api/client', () => ({
  get api() {
    return mockApi;
  },
}));

let mockOnline = true;
jest.mock('@/lib/use-online', () => ({ useOnline: () => mockOnline }));

function useMockApi(options: MockFetchOptions) {
  const client = createApiClient({
    baseUrl: 'https://test.nexahub.ng',
    fetch: createMockFetch(options),
  });
  mockApi.getDiscoverHome = client.getDiscoverHome;
}

const firstTrending = discoverHome.trendingProducts[0]!;
const firstStore = discoverHome.featuredStores[0]!;

describe('HomeScreen', () => {
  beforeEach(() => {
    mockOnline = true;
  });

  it('shows a skeleton while loading, then the feed from the fixtures', async () => {
    useMockApi({ delayMs: 50 });
    await renderWithProviders(<HomeScreen />);

    expect(screen.getByTestId('home-loading')).toBeOnTheScreen();

    expect(await screen.findByTestId('home-list')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-loading')).not.toBeOnTheScreen();
    expect(screen.getByText('Featured stores')).toBeOnTheScreen();
    expect(screen.getByTestId(`store-card-${firstStore.slug}`)).toBeOnTheScreen();
    expect(screen.getByTestId(`product-card-t-${firstTrending.id}`)).toBeOnTheScreen();
  });

  it('shows the empty state when every section is empty', async () => {
    useMockApi({ scenario: 'empty' });
    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByTestId('home-empty')).toBeOnTheScreen();
    expect(screen.getByText('Nothing here yet')).toBeOnTheScreen();
  });

  it('shows the error state with the server message, and recovers on retry', async () => {
    useMockApi({ failureRate: 1 });
    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByTestId('home-error')).toBeOnTheScreen();
    expect(
      screen.getByText('Something went wrong on our side. Please try again.'),
    ).toBeOnTheScreen();

    useMockApi({ failureRate: 0 });
    await fireEvent.press(screen.getByTestId('home-error-retry'));

    expect(await screen.findByTestId('home-list')).toBeOnTheScreen();
  });

  it('shows the offline state when the request fails with no connection', async () => {
    mockOnline = false;
    useMockApi({ failureRate: 1 });
    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByTestId('home-offline')).toBeOnTheScreen();
    expect(screen.getByText('You’re offline')).toBeOnTheScreen();
  });
});
