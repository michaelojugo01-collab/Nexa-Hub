import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  /** Show a back button (default true) */
  back?: boolean;
};

/** Title block shared by the sign-in and onboarding screens. */
export function AuthHeader({ title, subtitle, back = true }: AuthHeaderProps) {
  const { colors } = useTheme();
  return (
    <View className="gap-2 pb-6 pt-2">
      {back && router.canGoBack() ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="auth-back"
          className="-ml-2 mb-2 h-10 w-10 items-center justify-center rounded-full active:bg-surface-muted">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" className="text-3xl font-bold text-text">
        {title}
      </Text>
      {subtitle ? <Text className="text-base text-text-muted">{subtitle}</Text> : null}
    </View>
  );
}
