import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme/ThemeProvider';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Renders with the same providers as the app. Defaults to a fresh QueryClient with no retries;
 * integration tests pass the app's own `queryClient` so cache writes from mutations are visible.
 */
export async function renderWithProviders(
  ui: ReactElement,
  options: { queryClient?: QueryClient } = {},
) {
  const queryClient =
    options.queryClient ??
    new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const result = await render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <ThemeProvider>{ui}</ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}
