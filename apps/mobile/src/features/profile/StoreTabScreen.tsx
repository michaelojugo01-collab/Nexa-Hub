import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Badge, EmptyState, ErrorState, Screen, Skeleton } from '@/components';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { StoreDashboard } from '@/features/stores/StoreDashboard';
import { useMyStore } from '@/features/stores/use-my-store';
import { useAuthStore } from '@/stores/auth-store';

import { BecomeSellerSheet } from './BecomeSellerSheet';
import { isSeller } from './is-seller';

/**
 * Create/Store tab, decided by the server: buyers get the one-tap upgrade (F1); sellers with
 * no store (GET /v1/me/store → 404) get store setup; sellers with a store get the dashboard.
 */
export function StoreTabScreen() {
  const user = useAuthStore((s) => s.user);
  const [sheet, setSheet] = useState(false);
  const seller = isSeller(user);
  const myStore = useMyStore(seller);

  return (
    <Screen testID="store-screen" scroll>
      <View className="flex-row items-center gap-2 pb-4 pt-4">
        <Text accessibilityRole="header" className="text-2xl font-bold text-text">
          {seller ? 'Your store' : 'Sell on Nexa'}
        </Text>
        {seller ? <Badge label="Seller" variant="chrome" testID="store-seller-badge" /> : null}
      </View>

      {!seller ? (
        <EmptyState
          icon="rocket-outline"
          title="Start selling"
          description="Turn your skills, notes, designs or products into income. One tap, no approval."
          actionLabel="Become a seller"
          onAction={() => setSheet(true)}
          testID="store-buyer-state"
        />
      ) : myStore.isPending ? (
        <View className="gap-3" testID="store-loading" accessibilityLabel="Loading your store">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </View>
      ) : myStore.isError ? (
        <ErrorState
          variant={isOfflineError(myStore.error) ? 'offline' : 'error'}
          message={errorMessage(myStore.error)}
          onRetry={() => void myStore.refetch()}
          retrying={myStore.isFetching}
          testID="store-error"
        />
      ) : myStore.data ? (
        <StoreDashboard store={myStore.data} />
      ) : (
        <EmptyState
          icon="storefront-outline"
          title="Set up your store"
          description="Name, link, category and photos. It takes about 2 minutes, and you can change it later."
          actionLabel="Set up my store"
          onAction={() => router.push('/seller/setup')}
          testID="store-setup-intro"
        />
      )}
      <BecomeSellerSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}
