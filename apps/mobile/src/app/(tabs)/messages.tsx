import { Text } from 'react-native';

import { EmptyState, Screen } from '@/components';

export default function MessagesScreen() {
  return (
    <Screen testID="messages-screen">
      <Text accessibilityRole="header" className="pt-4 text-2xl font-bold text-text">
        Messages
      </Text>
      <EmptyState
        className="flex-1"
        icon="chatbubbles-outline"
        title="No messages yet"
        description="Broadcasts from creators you follow and your notifications will show up here."
        testID="messages-empty"
      />
    </Screen>
  );
}
