import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** Icon element shown before the label */
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  testID?: string;
  /** Defaults to `label` */
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const container: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:bg-primary-pressed',
  secondary: 'bg-surface border border-text active:bg-surface-muted',
  ghost: 'bg-transparent active:bg-surface-muted',
};

const text: Record<ButtonVariant, string> = {
  primary: 'text-text-inverse',
  secondary: 'text-text',
  ghost: 'text-text',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  className,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={cn(
        'flex-row items-center justify-center rounded-md',
        size === 'md' ? 'min-h-12 px-5' : 'min-h-10 px-4',
        container[variant],
        fullWidth && 'w-full',
        disabled && 'opacity-40',
        className,
      )}>
      {loading ? (
        <ActivityIndicator
          testID={testID ? `${testID}-spinner` : undefined}
          color={variant === 'primary' ? colors.textInverse : colors.text}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text
            className={cn('font-semibold', size === 'md' ? 'text-base' : 'text-sm', text[variant])}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
