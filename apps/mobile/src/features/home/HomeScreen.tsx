import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { EmptyState, ErrorState, ProductCard, Screen } from '@/components';
import { useDiscoverHome } from '@/lib/api/use-discover-home';
import { useOnline } from '@/lib/use-online';
import { toast } from '@/stores/toast-store';
import { useTheme } from '@/theme/ThemeProvider';

import { FeaturedStores } from './FeaturedStores';
import { isHomeEmpty, toHomeItems, type HomeItem } from './home-items';
import { HomeSkeleton } from './HomeSkeleton';

function Header() {
  return (
    <View className="px-4 pb-2 pt-4">
      <Text accessibilityRole="header" className="text-3xl font-bold text-text">
        Nexa Hub
      </Text>
      <Text className="text-sm text-text-muted">Discover Nigerian creators and sellers</Text>
    </View>
  );
}

function OfflineBanner() {
  return (
    <View
      testID="home-offline-banner"
      accessibilityLiveRegion="polite"
      className="mx-4 mb-2 rounded-md bg-surface-muted px-3 py-2">
      <Text className="text-xs text-text-muted">
        You’re offline. Showing what we loaded earlier.
      </Text>
    </View>
  );
}

export function HomeScreen() {
  const { colors } = useTheme();
  const online = useOnline();
  const { data, error, isPending, isError, refetch, isRefetching } = useDiscoverHome();
  const [pulling, setPulling] = useState(false);

  const items = useMemo(() => (data ? toHomeItems(data) : []), [data]);

  const onRefresh = useCallback(async () => {
    setPulling(true);
    await refetch();
    setPulling(false);
  }, [refetch]);

  // A background refresh failed but we still have data: keep showing it and say so.
  const refreshFailed = isError && !!data;
  useEffect(() => {
    if (refreshFailed) toast.show(error?.message ?? 'Couldn’t refresh', 'error');
  }, [refreshFailed, error]);

  let body: React.ReactNode;

  if (isPending) {
    body = <HomeSkeleton />;
  } else if (!data) {
    body = online ? (
      <ErrorState
        testID="home-error"
        message={error?.message}
        onRetry={() => refetch()}
        retrying={isRefetching}
      />
    ) : (
      <ErrorState
        testID="home-offline"
        variant="offline"
        onRetry={() => refetch()}
        retrying={isRefetching}
      />
    );
  } else if (isHomeEmpty(data)) {
    body = (
      <EmptyState
        testID="home-empty"
        icon="sparkles-outline"
        title="Nothing here yet"
        description="New stores and products will show up here as sellers join."
        actionLabel="Refresh"
        onAction={() => refetch()}
      />
    );
  } else {
    body = (
      <FlashList<HomeItem>
        testID="home-list"
        data={items}
        numColumns={2}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.kind}
        overrideItemLayout={(layout, item) => {
          if (item.kind !== 'product') layout.span = 2;
        }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'heading':
              return (
                <Text
                  accessibilityRole="header"
                  className="px-2 pb-3 pt-5 text-lg font-bold text-text">
                  {item.title}
                </Text>
              );
            case 'stores':
              return <FeaturedStores stores={item.stores} />;
            case 'product':
              return (
                <View className="px-2 pb-4">
                  <ProductCard
                    testID={`product-card-${item.key}`}
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
          }
        }}
      />
    );
  }

  return (
    <Screen padded={false} testID="home-screen">
      <Header />
      {!online && data ? <OfflineBanner /> : null}
      <View className="flex-1">{body}</View>
    </Screen>
  );
}
