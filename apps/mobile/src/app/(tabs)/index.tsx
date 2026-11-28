import { EmptyState, Screen } from '@/components';

export default function HomeScreen() {
  return (
    <Screen testID="home-screen">
      <EmptyState
        icon="home-outline"
        title="Home"
        description="Trending products and featured stores will appear here."
      />
    </Screen>
  );
}
