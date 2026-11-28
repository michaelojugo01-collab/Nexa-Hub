import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, ErrorState, Screen, Skeleton } from '@/components';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { storeLinkLabel } from '@/lib/store-links';
import { ShareStoreSheet } from '@/features/stores/ShareStoreSheet';
import { useTheme } from '@/theme/ThemeProvider';

import { useOwnProduct } from './use-own-product';

/** After publishing: Share product is the main action. */
export function ProductPublishedScreen() {
  const { colors } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const product = useOwnProduct(id);
  const [sharing, setSharing] = useState(false);

  if (product.isPending) {
    return (
      <Screen testID="product-published-loading">
        <Skeleton className="mt-16 h-40 w-full rounded-lg" />
      </Screen>
    );
  }
  if (product.isError) {
    return (
      <Screen testID="product-published-error">
        <ErrorState
          className="flex-1"
          variant={isOfflineError(product.error) ? 'offline' : 'error'}
          message={errorMessage(product.error)}
          onRetry={() => void product.refetch()}
        />
      </Screen>
    );
  }
  const p = product.data;
  const inReview = p.state === 'pending_review';
  const link = `${storeLinkLabel(p.store.slug)}/${p.slug}`;

  return (
    <Screen testID="product-published" edges={['top', 'bottom']} scroll>
      <View className="items-center gap-4 pb-6 pt-16">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Ionicons
            name={inReview ? 'time-outline' : 'checkmark'}
            size={40}
            color={colors.textInverse}
          />
        </View>
        <Text accessibilityRole="header" className="text-center text-2xl font-bold text-text">
          {inReview ? 'Sent for review' : `${p.title} is live!`}
        </Text>
        <Text className="text-center text-base text-text-muted" testID="product-published-note">
          {inReview
            ? 'Our team checks listings like this one before they go on sale. We’ll let you know.'
            : p.visibility === 'unlisted'
              ? 'It’s unlisted: only people with the link can find it. Share the link with your buyers.'
              : 'It’s in your store now. Share the link on WhatsApp, Instagram and your status.'}
        </Text>
        {!inReview ? (
          <Text
            className="text-center text-base font-semibold text-text"
            testID="product-published-link">
            {link}
          </Text>
        ) : null}
      </View>
      <View className="gap-3">
        {!inReview ? (
          <>
            <Button
              label="Share product"
              onPress={() => setSharing(true)}
              fullWidth
              testID="product-published-share"
            />
            <Button
              label="View product"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/product/[store]/[product]',
                  params: { store: p.store.slug, product: p.slug },
                })
              }
              fullWidth
              testID="product-published-view"
            />
          </>
        ) : null}
        <Button
          label="Add another product"
          variant={inReview ? 'primary' : 'ghost'}
          onPress={() => router.replace('/seller/products/new')}
          fullWidth
          testID="product-published-another"
        />
        <Button
          label="Back to my store"
          variant="ghost"
          onPress={() => router.dismissTo('/store')}
          fullWidth
          testID="product-published-store"
        />
      </View>
      <ShareStoreSheet
        visible={sharing}
        onClose={() => setSharing(false)}
        store={p.store}
        product={{ slug: p.slug, title: p.title }}
      />
    </Screen>
  );
}
