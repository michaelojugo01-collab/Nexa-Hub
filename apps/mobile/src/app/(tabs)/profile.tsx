import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Avatar, Badge, Card, ListItem, Screen } from '@/components';

export default function ProfileScreen() {
  return (
    <Screen scroll testID="profile-screen">
      <View className="items-center gap-2 pb-6 pt-8">
        <Avatar name="Guest User" size="xl" ring />
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">
          Guest
        </Text>
        <Badge label="Buyer" />
      </View>

      <Card flush className="px-4">
        <ListItem icon="library-outline" title="Library" subtitle="Coming soon" disabled />
        <ListItem icon="wallet-outline" title="Payout settings" subtitle="Coming soon" disabled />
        <ListItem
          icon="shield-checkmark-outline"
          title="Verification"
          subtitle="Coming soon"
          disabled
        />
        <ListItem icon="help-buoy-outline" title="Support" subtitle="Coming soon" disabled />
        <ListItem icon="settings-outline" title="Settings" subtitle="Coming soon" disabled last />
      </Card>

      {__DEV__ ? (
        <Card flush className="mt-6 px-4">
          <ListItem
            icon="construct-outline"
            title="Components"
            subtitle="Developer gallery of every component and state"
            onPress={() => router.push('/dev/components')}
            testID="profile-dev-components"
            last
          />
        </Card>
      ) : null}
    </Screen>
  );
}
