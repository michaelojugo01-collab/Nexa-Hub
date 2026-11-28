import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, ErrorState, PriceText, Skeleton } from '@/components';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';

import { LinkScreenFrame } from './LinkScreenFrame';
import { usePublicProduct } from './use-public-product';

/**
 * PLACEHOLDER product screen for product links (/{store}/{product}). The real product page,
 * with buying, is module F4.
 */
export function ProductPlaceholderScreen() {
  const params = useLocalSearchParams<{ store: string; product: string }>();
  const store = (params.store ?? '').toLowerCase();
  const slug = (params.product ?? '').toLowerCase();
  const query = usePublicProduct(store, slug);

  let body;
  if (query.isPending) {
    body = (
      <View className="gap-3 px-4" testID="product-loading">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
      </View>
    );
  } else if (query.isError) {
    body =
      errorCode(query.error) === 'NOT_FOUND' ? (
        <EmptyState
          className="flex-1"
          icon="help-circle-outline"
          title="Product not found"
          description="It may have been removed, or the store is private."
          actionLabel="Go home"
          onAction={() => router.replace('/')}
          testID="product-not-found"
        />
      ) : (
        <ErrorState
          className="flex-1"
          variant={isOfflineError(query.error) ? 'offline' : 'error'}
          message={errorMessage(query.error)}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          testID="product-error"
        />
      );
  } else {
    const product = query.data;
    const cover = product.images[0] ?? product.imageUrl;
    body = (
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8">
        {cover ? (
          <Image
            source={{ uri: cover }}
            contentFit="cover"
            accessible={false}
            className="aspect-square w-full rounded-lg bg-surface-muted"
          />
        ) : null}
        <Text accessibilityRole="header" className="text-2xl font-bold text-text">
          {product.title}
        </Text>
        <PriceText
          amountKobo={product.price.amountKobo}
          compareAtKobo={product.compareAtPrice?.amountKobo}
          size="lg"
        />
        {product.description ? (
          <Text className="text-base text-text">{product.description}</Text>
        ) : null}
        <Text className="rounded-md bg-surface-muted px-3 py-2 text-sm text-text-muted">
          Buying in the app is coming in the next update.
        </Text>
        <Button
          label={`Visit ${product.storeInfo.name}`}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/store/[slug]', params: { slug: product.storeInfo.slug } })
          }
          testID="product-visit-store"
        />
      </ScrollView>
    );
  }

  return <LinkScreenFrame testID="product-screen">{body}</LinkScreenFrame>;
}
