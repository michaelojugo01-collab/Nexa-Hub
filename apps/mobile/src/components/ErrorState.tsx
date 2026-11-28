import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

import { Button } from './Button';

type ErrorStateProps = {
  /** 'offline' shows the no-connection message */
  variant?: 'error' | 'offline';
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
  testID?: string;
};

const copy = {
  error: {
    icon: 'alert-circle-outline',
    title: 'Something went wrong',
    message: 'We couldn’t load this. Please try again.',
  },
  offline: {
    icon: 'cloud-offline-outline',
    title: 'You’re offline',
    message: 'Check your connection. We’ll reload when you’re back online.',
  },
} as const;

export function ErrorState({
  variant = 'error',
  title,
  message,
  onRetry,
  retrying = false,
  className,
  testID,
}: ErrorStateProps) {
  const { colors } = useTheme();
  const c = copy[variant];
  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      className={cn('items-center justify-center gap-3 px-6 py-10', className)}>
      <View
        className={cn(
          'h-16 w-16 items-center justify-center rounded-full',
          variant === 'error' ? 'bg-error-bg' : 'bg-surface-muted',
        )}>
        <Ionicons
          name={c.icon}
          size={28}
          color={variant === 'error' ? colors.error : colors.textMuted}
          accessible={false}
        />
      </View>
      <Text accessibilityRole="header" className="text-center text-lg font-semibold text-text">
        {title ?? c.title}
      </Text>
      <Text className="text-center text-sm text-text-muted">{message ?? c.message}</Text>
      {onRetry ? (
        <Button
          label="Try again"
          onPress={onRetry}
          loading={retrying}
          size="sm"
          className="mt-2"
          testID={testID ? `${testID}-retry` : undefined}
        />
      ) : null}
    </View>
  );
}
