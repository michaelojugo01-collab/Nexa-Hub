import { Text } from 'react-native';

import { EmptyState, Screen } from '@/components';

export default function DiscoverScreen() {
  return (
    <Screen testID="discover-screen">
      <Text accessibilityRole="header" className="pt-4 text-2xl font-bold text-text">
        Discover
      </Text>
      <EmptyState
        className="flex-1"
        icon="compass-outline"
        title="Search is coming"
        description="Search, categories, leaderboards and featured collections will live here."
        testID="discover-empty"
      />
    </Screen>
  );
}
