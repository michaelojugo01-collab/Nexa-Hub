import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, ErrorState, Screen, Skeleton } from '@/components';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { storeLinkLabel } from '@/lib/store-links';
import { useTheme } from '@/theme/ThemeProvider';

import { PayoutReminder } from './PayoutReminder';
import { ShareStoreSheet } from './ShareStoreSheet';
import { useMyStore } from './use-my-store';

/** After publishing: Share store is the main action. */
export function StorePublishedScreen() {
  const { colors } = useTheme();
  const store = useMyStore();
  const [sharing, setSharing] = useState(false);

  if (store.isPending) {
    return (
      <Screen testID="store-published-loading">
        <Skeleton className="mt-16 h-40 w-full rounded-lg" />
      </Screen>
    );
  }
  if (store.isError || !store.data) {
    return (
      <Screen testID="store-published-error">
        <ErrorState
          className="flex-1"
          variant={isOfflineError(store.error) ? 'offline' : 'error'}
          message={store.isError ? errorMessage(store.error) : 'We couldn’t find your store.'}
          onRetry={() => void store.refetch()}
          retrying={store.isFetching}
        />
      </Screen>
    );
  }
  const data = store.data;

  return (
    <Screen testID="store-published" edges={['top', 'bottom']} scroll>
      <View className="items-center gap-4 pb-6 pt-16">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Ionicons name="checkmark" size={40} color={colors.textInverse} />
        </View>
        <Text accessibilityRole="header" className="text-center text-2xl font-bold text-text">
          {data.name} is live!
        </Text>
        <Text className="text-center text-base text-text-muted">
          Share your link on WhatsApp, Instagram and your status so buyers can find you.
        </Text>
        <Text className="text-lg font-semibold text-text" testID="store-published-link">
          {storeLinkLabel(data.slug)}
        </Text>
      </View>
      <View className="gap-3">
        <Button
          label="Share store"
          onPress={() => setSharing(true)}
          fullWidth
          testID="store-published-share"
        />
        <Button
          label="View my store"
          variant="secondary"
          onPress={() => router.push({ pathname: '/store/[slug]', params: { slug: data.slug } })}
          fullWidth
          testID="store-published-view"
        />
        <Button
          label="Go to dashboard"
          variant="ghost"
          onPress={() => router.dismissTo('/store')}
          fullWidth
          testID="store-published-dashboard"
        />
        <View className="pt-3">
          <PayoutReminder />
        </View>
      </View>
      <ShareStoreSheet visible={sharing} onClose={() => setSharing(false)} store={data} />
    </Screen>
  );
}
