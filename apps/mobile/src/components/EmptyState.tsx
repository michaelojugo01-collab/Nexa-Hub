import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

import { Button } from './Button';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  testID?: string;
};

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
  className,
  testID,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} className={cn('items-center justify-center gap-3 px-6 py-10', className)}>
      <View className="h-16 w-16 items-center justify-center rounded-full bg-accent-muted">
        <Ionicons name={icon} size={28} color={colors.textMuted} accessible={false} />
      </View>
      <Text accessibilityRole="header" className="text-center text-lg font-semibold text-text">
        {title}
      </Text>
      {description ? (
        <Text className="text-center text-sm text-text-muted">{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          className="mt-2"
          testID={testID ? `${testID}-action` : undefined}
        />
      ) : null}
    </View>
  );
}
