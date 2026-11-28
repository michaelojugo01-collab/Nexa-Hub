import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

type InlineNoticeProps = {
  tone: 'error' | 'warning' | 'info';
  message: string;
  children?: ReactNode;
  testID?: string;
};

/** A small message box for form-level errors (rate limited, offline, SMS down). */
export function InlineNotice({ tone, message, children, testID }: InlineNoticeProps) {
  const { colors } = useTheme();
  const icon =
    tone === 'error' ? 'alert-circle' : tone === 'warning' ? 'warning' : 'information-circle';
  const color =
    tone === 'error' ? colors.error : tone === 'warning' ? colors.warning : colors.textMuted;
  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      className={cn(
        'gap-3 rounded-md p-3',
        tone === 'error'
          ? 'bg-error-bg'
          : tone === 'warning'
            ? 'bg-warning-bg'
            : 'bg-surface-muted',
      )}>
      <View className="flex-row gap-2">
        <Ionicons name={icon} size={18} color={color} accessible={false} />
        <Text className="flex-1 text-sm text-text">{message}</Text>
      </View>
      {children}
    </View>
  );
}
