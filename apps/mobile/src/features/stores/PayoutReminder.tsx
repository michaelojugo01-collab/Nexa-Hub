import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button, Card } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

import { usePayoutReminder } from './use-payout-reminder';

export function PayoutReminder() {
  const { colors } = useTheme();
  const reminder = usePayoutReminder();
  if (!reminder.visible) return null;

  return (
    <Card className="gap-3 border-accent bg-accent-muted" testID="payout-reminder">
      <View className="flex-row items-start gap-3">
        <Ionicons name="card-outline" size={22} color={colors.text} accessible={false} />
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-text">
            Add your bank account to get paid
          </Text>
          <Text className="text-sm text-text-muted">
            You can sell now. We’ll pay your earnings into your bank account once it’s added.
          </Text>
        </View>
        <Pressable
          onPress={reminder.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss reminder"
          hitSlop={12}
          testID="payout-reminder-dismiss">
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <Button
        label="Add bank account"
        size="sm"
        onPress={() => router.push('/seller/payouts')}
        className="self-start"
        testID="payout-reminder-action"
      />
    </Card>
  );
}
