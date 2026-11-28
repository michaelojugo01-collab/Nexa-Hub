import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

/** Back bar for screens opened from links (may be the first screen: back goes Home). */
export function LinkScreenFrame({ children, testID }: { children: ReactNode; testID: string }) {
  const { colors } = useTheme();
  return (
    <Screen padded={false} testID={testID}>
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          testID={`${testID}-back`}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>
      <View className="flex-1">{children}</View>
    </Screen>
  );
}
