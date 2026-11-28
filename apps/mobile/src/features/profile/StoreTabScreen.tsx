import { useState } from 'react';
import { Text, View } from 'react-native';

import { Badge, EmptyState, Screen } from '@/components';
import { useAuthStore } from '@/stores/auth-store';

import { BecomeSellerSheet } from './BecomeSellerSheet';
import { isSeller } from './is-seller';

/** Create/Store tab: buyers get the one-tap upgrade, sellers get the store entry point (F2). */
export function StoreTabScreen() {
  const user = useAuthStore((s) => s.user);
  const [sheet, setSheet] = useState(false);
  const seller = isSeller(user);

  return (
    <Screen testID="store-screen">
      <View className="flex-row items-center gap-2 pt-4">
        <Text accessibilityRole="header" className="text-2xl font-bold text-text">
          {seller ? 'Your store' : 'Sell on Nexa'}
        </Text>
        {seller ? <Badge label="Seller" variant="chrome" testID="store-seller-badge" /> : null}
      </View>
      {seller ? (
        <EmptyState
          className="flex-1"
          icon="storefront-outline"
          title={user?.store ? user.store.name : 'Set up your store'}
          description="Store setup, products, orders and earnings arrive in the next update."
          testID="store-seller-state"
        />
      ) : (
        <EmptyState
          className="flex-1"
          icon="rocket-outline"
          title="Start selling"
          description="Turn your skills, notes, designs or products into income. One tap, no approval."
          actionLabel="Become a seller"
          onAction={() => setSheet(true)}
          testID="store-buyer-state"
        />
      )}
      <BecomeSellerSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}
