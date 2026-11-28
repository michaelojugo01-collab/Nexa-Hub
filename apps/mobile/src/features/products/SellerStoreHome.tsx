import type { OwnProduct, OwnStore } from '@nexa/api-contract';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';

import { Badge, Button, EmptyState, ErrorState, Screen, Skeleton } from '@/components';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { cn } from '@/lib/cn';
import { ShareStoreSheet } from '@/features/stores/ShareStoreSheet';
import { StoreDashboard } from '@/features/stores/StoreDashboard';
import { useTheme } from '@/theme/ThemeProvider';

import { ProductActionsSheet } from './ProductActionsSheet';
import { ProductRow } from './ProductRow';
import { useMyProducts, type ProductTab } from './use-my-products';

const TABS: { key: ProductTab; label: string; empty: string }[] = [
  { key: 'live', label: 'Live', empty: 'Nothing on sale yet.' },
  { key: 'draft', label: 'Drafts', empty: 'No drafts. Products you start are saved here.' },
  { key: 'unpublished', label: 'Unpublished', empty: 'Nothing unpublished.' },
];

type Item =
  | { kind: 'product'; key: string; product: OwnProduct }
  | { kind: 'state'; key: string; state: 'loading' | 'empty' | 'error' }
  | { kind: 'more'; key: string };

/** Create/Store tab for a seller with a store: dashboard + their products. */
export function SellerStoreHome({ store }: { store: OwnStore }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<ProductTab>('live');
  const [acting, setActing] = useState<OwnProduct | null>(null);
  const [sharing, setSharing] = useState<OwnProduct | null>(null);
  const [pulling, setPulling] = useState(false);
  const list = useMyProducts(tab);
  const products = list.data?.pages.flatMap((p) => p.data) ?? [];

  const items: Item[] = list.isPending
    ? [{ kind: 'state', key: 'loading', state: 'loading' }]
    : list.isError && products.length === 0
      ? [{ kind: 'state', key: 'error', state: 'error' }]
      : products.length === 0
        ? [{ kind: 'state', key: 'empty', state: 'empty' }]
        : [
            ...products.map<Item>((p) => ({ kind: 'product', key: p.id, product: p })),
            ...(list.isFetchingNextPage ? [{ kind: 'more', key: 'more' } as Item] : []),
          ];

  async function refresh() {
    setPulling(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myStore }),
        list.refetch(),
      ]);
    } finally {
      setPulling(false);
    }
  }

  const header = (
    <View className="gap-4 px-4 pb-2 pt-4">
      <View className="flex-row items-center gap-2">
        <Text accessibilityRole="header" className="text-2xl font-bold text-text">
          Your store
        </Text>
        <Badge label="Seller" variant="chrome" testID="store-seller-badge" />
      </View>
      <StoreDashboard store={store} />
      <View className="flex-row items-center justify-between pt-2">
        <Text accessibilityRole="header" className="text-lg font-bold text-text">
          Products
        </Text>
        <Button
          label="Add product"
          size="sm"
          onPress={() => router.push('/seller/products/new')}
          testID="products-add"
        />
      </View>
      <View className="flex-row border-b border-border" accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
            testID={`products-tab-${t.key}`}
            className={cn(
              'mr-5 border-b-2 py-2',
              tab === t.key ? 'border-primary' : 'border-transparent',
            )}>
            <Text
              className={cn(
                'text-sm font-semibold',
                tab === t.key ? 'text-text' : 'text-text-muted',
              )}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <Screen testID="store-screen" padded={false}>
      <FlashList<Item>
        testID="products-list"
        data={items}
        keyExtractor={(i) => i.key}
        getItemType={(i) => i.kind}
        ListHeaderComponent={header}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => void refresh()}
            tintColor={colors.text}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => {
          if (item.kind === 'product') {
            return (
              <View className="px-4">
                <ProductRow
                  product={item.product}
                  onPress={() =>
                    router.push({
                      pathname: '/seller/products/[id]',
                      params: { id: item.product.id },
                    })
                  }
                  onMore={() => setActing(item.product)}
                />
              </View>
            );
          }
          if (item.kind === 'more') {
            return (
              <View className="items-center py-4">
                <ActivityIndicator color={colors.textMuted} />
              </View>
            );
          }
          if (item.state === 'loading') {
            return (
              <View className="gap-3 px-4 pt-3" testID="products-loading">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </View>
            );
          }
          if (item.state === 'error') {
            return (
              <ErrorState
                variant={isOfflineError(list.error) ? 'offline' : 'error'}
                message={errorMessage(list.error)}
                onRetry={() => void list.refetch()}
                retrying={list.isFetching}
                testID="products-error"
              />
            );
          }
          const noProducts = tab === 'live' && store.productCount === 0;
          return noProducts ? (
            <EmptyState
              icon="pricetag-outline"
              title="Add your first product"
              description="Ebooks, templates, beats, video lessons, Notion systems and more."
              actionLabel="Add product"
              onAction={() => router.push('/seller/products/new')}
              testID="dashboard-products-empty"
            />
          ) : (
            <Text
              className="px-4 py-8 text-center text-sm text-text-muted"
              testID={`products-empty-${tab}`}>
              {TABS.find((t) => t.key === tab)?.empty}
            </Text>
          );
        }}
      />
      <ProductActionsSheet product={acting} onClose={() => setActing(null)} onShare={setSharing} />
      {sharing ? (
        <ShareStoreSheet
          visible
          onClose={() => setSharing(null)}
          store={store}
          product={{ slug: sharing.slug, title: sharing.title }}
        />
      ) : null}
    </Screen>
  );
}
