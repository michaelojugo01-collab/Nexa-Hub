import Ionicons from '@expo/vector-icons/Ionicons';
import type { ProductSummary, Store } from '@nexa/api-contract';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  ProductCard,
  Screen,
  Skeleton,
  StoreHeader,
} from '@/components';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { cn } from '@/lib/cn';
import { useFeatureFlag } from '@/lib/flags';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme/ThemeProvider';

import { ShareStoreSheet } from './ShareStoreSheet';
import { useReturnTo } from './return-to';
import { useFollowStore } from './use-follow-store';
import { useStore } from './use-store';
import { useStoreProducts } from './use-store-products';

type Tab = 'products' | 'services' | 'about';

type Item =
  | { kind: 'header'; key: string }
  | { kind: 'tabs'; key: string }
  | { kind: 'product'; key: string; product: ProductSummary }
  | { kind: 'state'; key: string; state: 'loading' | 'empty' | 'error' }
  | { kind: 'about'; key: string }
  | { kind: 'more'; key: string };

const memberSince = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

/** Public store page: /store/{slug} (also opened by nexahub://store/{slug}). */
export function PublicStoreScreen() {
  const params = useLocalSearchParams<{ slug: string; as?: string }>();
  const slug = (params.slug ?? '').toLowerCase();
  const store = useStore(slug);
  const redirectTo = store.data?.redirectTo;
  const signedIn = useAuthStore((s) => s.status === 'signedIn' && !s.onboarding);
  const returnTo = useReturnTo((s) => s.path);

  // Signed in from this store (Follow while signed out): we're back, nothing more to do.
  useEffect(() => {
    if (signedIn && returnTo === `/store/${slug}`) useReturnTo.getState().set(null);
  }, [signedIn, returnTo, slug]);

  // Old slug: the server says where the store lives now; replace the route (no back to it).
  useEffect(() => {
    if (!redirectTo || redirectTo === slug || !store.data) return;
    queryClient.setQueryData(queryKeys.store(redirectTo), { ...store.data, redirectTo: null });
    router.replace({
      pathname: '/store/[slug]',
      params: { slug: redirectTo, ...(params.as ? { as: params.as } : {}) },
    });
  }, [redirectTo, slug, store.data, params.as]);

  let body;
  if (store.isPending || (redirectTo && redirectTo !== slug)) {
    body = <StoreSkeleton />;
  } else if (store.isError) {
    const code = errorCode(store.error);
    body =
      code === 'STORE_PRIVATE' ? (
        <EmptyState
          className="flex-1"
          icon="lock-closed-outline"
          title="This store is private"
          description="The seller has hidden this store for now. Check back later."
          testID="store-private"
        />
      ) : code === 'NOT_FOUND' ? (
        <EmptyState
          className="flex-1"
          icon="help-circle-outline"
          title="Store not found"
          description="This link doesn’t match any store. Check the spelling, or ask the seller for their link."
          actionLabel="Go home"
          onAction={() => router.replace('/')}
          testID="store-not-found"
        />
      ) : (
        <ErrorState
          className="flex-1"
          variant={isOfflineError(store.error) ? 'offline' : 'error'}
          message={errorMessage(store.error)}
          onRetry={() => void store.refetch()}
          retrying={store.isFetching}
          testID="store-load-error"
        />
      );
  } else {
    body = <StoreBody store={store.data} asBuyer={params.as === 'buyer'} />;
  }

  return (
    <Screen padded={false} testID="public-store">
      <TopBar />
      <View className="flex-1">{body}</View>
    </Screen>
  );
}

function TopBar() {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center px-4 py-2">
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        testID="store-back">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

function StoreSkeleton() {
  return (
    <View className="gap-3" testID="store-loading" accessibilityLabel="Loading store">
      <Skeleton className="h-32 w-full" />
      <View className="gap-3 px-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </View>
    </View>
  );
}

function StoreBody({ store, asBuyer }: { store: Store; asBuyer: boolean }) {
  const { colors } = useTheme();
  const servicesEnabled = useFeatureFlag('servicesTab');
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const [tab, setTab] = useState<Tab>('products');
  const [sharing, setSharing] = useState(false);
  const follow = useFollowStore(store.slug);
  const products = useStoreProducts(store.slug, tab === 'products');
  const owner = store.isOwner && !asBuyer;

  function onFollow() {
    if (!signedIn) {
      // Come back here after signing in (or after onboarding for a new account).
      useReturnTo.getState().set(`/store/${store.slug}`);
      router.push('/welcome');
      return;
    }
    follow.mutate({ storeId: store.id, follow: !store.isFollowing });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'products', label: 'Products' },
    ...(servicesEnabled ? [{ key: 'services' as const, label: 'Services' }] : []),
    { key: 'about', label: 'About' },
  ];

  const items: Item[] = [
    { kind: 'header', key: 'header' },
    { kind: 'tabs', key: 'tabs' },
  ];
  if (tab === 'products') {
    const all = products.data?.pages.flatMap((p) => p.data) ?? [];
    if (products.isPending) items.push({ kind: 'state', key: 'loading', state: 'loading' });
    else if (products.isError && all.length === 0)
      items.push({ kind: 'state', key: 'error', state: 'error' });
    else if (all.length === 0) items.push({ kind: 'state', key: 'empty', state: 'empty' });
    else {
      for (const p of all) items.push({ kind: 'product', key: p.id, product: p });
      if (products.isFetchingNextPage) items.push({ kind: 'more', key: 'more' });
    }
  } else if (tab === 'services') {
    items.push({ kind: 'state', key: 'services', state: 'empty' });
  } else {
    items.push({ kind: 'about', key: 'about' });
  }

  return (
    <>
      <FlashList<Item>
        testID="store-list"
        data={items}
        numColumns={2}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.kind}
        overrideItemLayout={(layout, item) => {
          if (item.kind !== 'product') layout.span = 2;
        }}
        onEndReached={() => {
          if (tab === 'products' && products.hasNextPage && !products.isFetchingNextPage) {
            void products.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'header':
              return (
                <View>
                  <StoreHeader
                    name={store.name}
                    slug={store.slug}
                    location={store.location}
                    bio={store.bio}
                    avatarUrl={store.avatar?.medium ?? store.avatarUrl}
                    coverUrl={store.banner?.large ?? store.coverUrl}
                    followerCount={store.followerCount}
                    productCount={store.productCount}
                    verified={store.verified}
                    following={store.isFollowing}
                    onFollowPress={store.isOwner ? undefined : onFollow}
                    action={
                      owner ? (
                        <Button
                          label="Edit store"
                          size="sm"
                          variant="secondary"
                          onPress={() => router.push('/seller/edit')}
                          testID="store-edit"
                        />
                      ) : undefined
                    }
                    testID="store-header"
                  />
                  <View className="flex-row items-center gap-3 px-4 pt-3">
                    {store.category ? (
                      <Text className="text-sm text-text-muted" testID="store-category">
                        {store.category.name}
                      </Text>
                    ) : null}
                    <View className="flex-1" />
                    <Pressable
                      onPress={() => setSharing(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Share store"
                      hitSlop={8}
                      testID="store-share">
                      <Ionicons name="share-outline" size={22} color={colors.text} />
                    </Pressable>
                  </View>
                  {store.isOwner && asBuyer ? (
                    <Text
                      className="mx-4 mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm text-text-muted"
                      testID="store-viewing-as-buyer">
                      You’re viewing your store as a buyer sees it.
                    </Text>
                  ) : null}
                </View>
              );
            case 'tabs':
              return (
                <View
                  className="mt-4 flex-row border-b border-border px-4"
                  accessibilityRole="tablist">
                  {tabs.map((t) => (
                    <Pressable
                      key={t.key}
                      onPress={() => setTab(t.key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: tab === t.key }}
                      testID={`store-tab-${t.key}`}
                      className={cn(
                        'mr-6 border-b-2 py-3',
                        tab === t.key ? 'border-primary' : 'border-transparent',
                      )}>
                      <Text
                        className={cn(
                          'text-base font-semibold',
                          tab === t.key ? 'text-text' : 'text-text-muted',
                        )}>
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            case 'product':
              return (
                <View className="px-2 pt-4">
                  <ProductCard
                    testID={`store-product-${item.product.id}`}
                    title={item.product.title}
                    storeName={item.product.store.name}
                    priceKobo={item.product.price.amountKobo}
                    compareAtKobo={item.product.compareAtPrice?.amountKobo}
                    imageUrl={item.product.imageUrl}
                    typeLabel={item.product.typeName}
                    featured={item.product.featured}
                  />
                </View>
              );
            case 'more':
              return (
                <View className="items-center py-4">
                  <ActivityIndicator color={colors.textMuted} />
                </View>
              );
            case 'about':
              return (
                <View className="gap-4 px-4 pt-4" testID="store-about">
                  <AboutRow label="About" value={store.bio ?? 'No bio yet.'} />
                  <AboutRow label="Category" value={store.category?.name ?? '—'} />
                  <AboutRow label="Member since" value={memberSince(store.createdAt)} />
                  {store.location ? <AboutRow label="Location" value={store.location} /> : null}
                </View>
              );
            case 'state':
              if (item.state === 'loading') {
                return (
                  <View className="flex-row gap-4 px-4 pt-4" testID="store-products-loading">
                    <Skeleton className="aspect-square flex-1 rounded-lg" />
                    <Skeleton className="aspect-square flex-1 rounded-lg" />
                  </View>
                );
              }
              if (item.state === 'error') {
                return (
                  <ErrorState
                    variant={isOfflineError(products.error) ? 'offline' : 'error'}
                    message={errorMessage(products.error)}
                    onRetry={() => void products.refetch()}
                    retrying={products.isFetching}
                    testID="store-products-error"
                  />
                );
              }
              return (
                <EmptyState
                  icon="pricetag-outline"
                  title={tab === 'services' ? 'No services yet' : 'No products yet'}
                  description={
                    owner ? 'Add your first product to start selling.' : 'Check back soon.'
                  }
                  actionLabel={owner && tab === 'products' ? 'Add product' : undefined}
                  onAction={owner ? () => router.push('/seller/products/new') : undefined}
                  testID="store-products-empty"
                />
              );
          }
        }}
      />
      <ShareStoreSheet visible={sharing} onClose={() => setSharing(false)} store={store} />
    </>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-medium uppercase text-text-muted">{label}</Text>
      <Text className="text-base text-text">{value}</Text>
    </View>
  );
}
