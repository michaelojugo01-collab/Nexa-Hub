import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { LinkScreenFrame } from '@/features/links/LinkScreenFrame';
import { usePublicProduct } from '@/features/links/use-public-product';
import { useReturnTo } from '@/features/stores/return-to';
import { useAuthStore } from '@/stores/auth-store';

import { ProductBuyerView } from './ProductBuyerView';

/**
 * Buyer product page (/product/{store}/{product}; web links /{store}/{product} open here).
 * Live public and unlisted products open; unpublished ones say "No longer available".
 */
export function ProductScreen() {
  const params = useLocalSearchParams<{ store: string; product: string }>();
  const store = (params.store ?? '').toLowerCase();
  const slug = (params.product ?? '').toLowerCase();
  const query = usePublicProduct(store, slug);
  const signedIn = useAuthStore((s) => s.status === 'signedIn' && !s.onboarding);

  function buy(productId: string) {
    if (!signedIn) {
      useReturnTo.getState().set(`/product/${store}/${slug}`);
      router.push('/welcome');
      return;
    }
    router.push({ pathname: '/checkout/[productId]', params: { productId } });
  }

  let body;
  if (query.isPending) {
    body = (
      <View className="gap-3" testID="product-loading">
        <Skeleton className="aspect-[4/3] w-full" />
        <View className="gap-3 px-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-12 w-full" />
        </View>
      </View>
    );
  } else if (query.isError) {
    const code = errorCode(query.error);
    body =
      code === 'PRODUCT_UNPUBLISHED' ? (
        <EmptyState
          className="flex-1"
          icon="archive-outline"
          title="No longer available"
          description="The seller has taken this product off sale. If you bought it, it’s still in your library."
          actionLabel="Visit the store"
          onAction={() => router.replace({ pathname: '/store/[slug]', params: { slug: store } })}
          testID="product-unpublished"
        />
      ) : code === 'NOT_FOUND' ? (
        <EmptyState
          className="flex-1"
          icon="help-circle-outline"
          title="Product not found"
          description="It may have been removed, or the link is wrong."
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
    const p = query.data;
    body = (
      <ProductBuyerView
        product={{
          title: p.title,
          typeName: p.typeName,
          contentMode: p.contentMode,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          coverUrl: p.images[0] ?? p.imageUrl,
          description: p.description,
          preview: p.preview,
          category: p.category,
          tags: p.tags,
          content: p.content,
          store: p.storeInfo,
        }}
        onBuy={() => buy(p.id)}
        testID="product-view"
      />
    );
  }

  return <LinkScreenFrame testID="product-screen">{body}</LinkScreenFrame>;
}
