import type { StoreSummary } from '@nexa/api-contract';
import { ScrollView, Text, View } from 'react-native';

import { Avatar, Badge, Card } from '@/components';

/** Horizontal row of featured stores. Bounded (max 10 from the API), so a ScrollView is fine. */
export function FeaturedStores({ stores }: { stores: StoreSummary[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 px-2 pb-2"
      testID="home-featured-stores">
      {stores.map((store) => (
        <Card
          key={store.id}
          className="w-40"
          testID={`store-card-${store.slug}`}
          accessibilityLabel={`${store.name}${store.location ? `, ${store.location}` : ''}`}>
          <View className="items-start gap-2">
            <Avatar name={store.name} uri={store.avatarUrl} size="md" ring={store.verified} />
            <Text className="text-sm font-semibold text-text" numberOfLines={1}>
              {store.name}
            </Text>
            {store.location ? (
              <Text className="text-xs text-text-muted" numberOfLines={1}>
                {store.location}
              </Text>
            ) : null}
            {store.verified ? <Badge label="Verified" variant="chrome" /> : null}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
