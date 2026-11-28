import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

type ListItemProps = {
  title: string;
  subtitle?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Custom left element (e.g. an Avatar). Overrides `icon`. */
  left?: ReactNode;
  /** Custom right element (e.g. a Badge). Defaults to a chevron when pressable. */
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Hide the bottom divider (e.g. on the last row) */
  last?: boolean;
  className?: string;
  testID?: string;
  accessibilityHint?: string;
};

export function ListItem({
  title,
  subtitle,
  icon,
  left,
  right,
  onPress,
  disabled = false,
  last = false,
  className,
  testID,
  accessibilityHint,
}: ListItemProps) {
  const { colors } = useTheme();

  const leading =
    left ??
    (icon ? (
      <View className="h-10 w-10 items-center justify-center rounded-md bg-surface-muted">
        <Ionicons name={icon} size={20} color={colors.text} accessible={false} />
      </View>
    ) : null);

  const trailing =
    right ??
    (onPress ? (
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} accessible={false} />
    ) : null);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      className={cn(
        'min-h-12 flex-row items-center gap-3 py-3',
        !last && 'border-b border-border',
        onPress && 'active:bg-surface-muted',
        disabled && 'opacity-40',
        className,
      )}>
      {leading}
      <View className="flex-1 gap-0.5">
        <Text className="text-base text-text" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-text-muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}
