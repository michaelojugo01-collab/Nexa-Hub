import type { OwnStore, StoreVisibility } from '@nexa/api-contract';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Button, Card, StoreHeader } from '@/components';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { storeLinkLabel } from '@/lib/store-links';
import { toast } from '@/stores/toast-store';
import { useTheme } from '@/theme/ThemeProvider';

import { PayoutReminder } from './PayoutReminder';
import { ShareStoreSheet } from './ShareStoreSheet';
import { useUpdateStore } from './use-update-store';

type Props = { store: OwnStore };

/** Seller's home for their store (Create/Store tab). */
export function StoreDashboard({ store }: Props) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  const update = useUpdateStore();
  const isPublic = store.visibility === 'public';

  function setVisibility(visibility: StoreVisibility) {
    update.mutate(
      { visibility },
      {
        onSuccess: (saved) =>
          toast.show(
            saved.visibility === 'public' ? 'Your store is public' : 'Your store is private',
            'success',
          ),
        onError: (error) =>
          toast.show(
            isOfflineError(error)
              ? 'You’re offline. Try again when you’re connected.'
              : errorMessage(error),
            'error',
          ),
      },
    );
  }

  return (
    <View className="gap-5" testID="store-dashboard">
      <Card flush>
        <StoreHeader
          name={store.name}
          slug={store.slug}
          location={store.location}
          bio={store.bio}
          avatarUrl={store.avatar?.medium ?? store.avatarUrl}
          coverUrl={store.banner?.medium ?? store.coverUrl}
          followerCount={store.followerCount}
          productCount={store.productCount}
          verified={store.verified}
          className="pb-4"
          testID="dashboard-header"
        />
      </Card>

      <View className="flex-row gap-2">
        <Button
          label="Edit store"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/seller/edit')}
          className="flex-1"
          testID="dashboard-edit"
        />
        <Button
          label="Share store"
          size="sm"
          onPress={() => setSharing(true)}
          className="flex-1"
          testID="dashboard-share"
        />
      </View>
      <Button
        label="View as buyer"
        variant="ghost"
        size="sm"
        onPress={() =>
          router.push({ pathname: '/store/[slug]', params: { slug: store.slug, as: 'buyer' } })
        }
        testID="dashboard-view-as-buyer"
      />

      <PayoutReminder />

      <View className="flex-row gap-3" testID="dashboard-stats">
        <Card className="flex-1 gap-1">
          <Text className="text-2xl font-bold text-text">{store.followerCount}</Text>
          <Text className="text-sm text-text-muted">Followers</Text>
        </Card>
        <Card className="flex-1 gap-1">
          <Text className="text-2xl font-bold text-text">{store.productCount}</Text>
          <Text className="text-sm text-text-muted">Products</Text>
        </Card>
      </View>

      <Card className="gap-2">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-text">
              {isPublic ? 'Public' : 'Private'}
            </Text>
            <Text className="text-xs text-text-muted">{storeLinkLabel(store.slug)}</Text>
          </View>
          <Switch
            value={isPublic}
            disabled={update.isPending}
            onValueChange={(on) => setVisibility(on ? 'public' : 'private')}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            thumbColor={colors.surface}
            accessibilityLabel="Store is public"
            accessibilityHint="Turn off to make your store private"
            testID="dashboard-visibility"
          />
        </View>
        <Text className="text-sm text-text-muted" testID="dashboard-visibility-help">
          {isPublic
            ? 'Anyone with your link can see your store, and it can appear in search and Discover.'
            : 'Private: only you can see your store. Your link shows “This store is private”, and the store is hidden from search and Discover. Nothing is deleted.'}
        </Text>
      </Card>

      <ShareStoreSheet visible={sharing} onClose={() => setSharing(false)} store={store} />
    </View>
  );
}
