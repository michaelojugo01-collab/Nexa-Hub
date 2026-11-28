import { Text } from 'react-native';

import { EmptyState, Screen } from '@/components';

export default function StoreScreen() {
  return (
    <Screen testID="store-screen">
      <Text accessibilityRole="header" className="pt-4 text-2xl font-bold text-text">
        Your store
      </Text>
      <EmptyState
        className="flex-1"
        icon="storefront-outline"
        title="Start selling"
        description="Your store dashboard, products, orders, earnings and payouts will live here."
        testID="store-empty"
      />
    </Screen>
  );
}
