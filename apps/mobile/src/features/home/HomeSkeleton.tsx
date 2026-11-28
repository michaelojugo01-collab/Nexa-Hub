import { View } from 'react-native';

import { Skeleton } from '@/components';

/** Loading placeholder shaped like the Home feed. */
export function HomeSkeleton() {
  return (
    <View
      testID="home-loading"
      accessible
      accessibilityLabel="Loading home"
      accessibilityState={{ busy: true }}
      className="gap-4 px-4 pt-2">
      <Skeleton className="h-5 w-40" />
      <View className="flex-row gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-40 rounded-lg" />
        ))}
      </View>
      <Skeleton className="h-5 w-32" />
      {[0, 1].map((row) => (
        <View key={row} className="flex-row gap-4">
          {[0, 1].map((col) => (
            <View key={col} className="flex-1 gap-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
