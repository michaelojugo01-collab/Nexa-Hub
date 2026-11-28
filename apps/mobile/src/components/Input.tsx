import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

type InputProps = Omit<TextInputProps, 'className' | 'editable'> & {
  label: string;
  /** Error message. When set, the field is shown in the error state. */
  error?: string;
  /** Helper text shown under the field when there is no error */
  helper?: string;
  /** Fixed text before the field, e.g. "+234" */
  prefix?: string;
  disabled?: boolean;
  className?: string;
  testID?: string;
};

export function Input({
  label,
  error,
  helper,
  prefix,
  disabled = false,
  className,
  testID,
  onFocus,
  onBlur,
  ...inputProps
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const message = error ?? helper;

  return (
    <View className={cn('gap-1', className)} testID={testID}>
      <Text className="text-sm font-medium text-text">{label}</Text>
      <View
        className={cn(
          'min-h-12 flex-row items-center rounded-md border bg-surface',
          error ? 'border-error' : focused ? 'border-accent' : 'border-border-strong',
          disabled && 'bg-surface-muted opacity-60',
        )}>
        {prefix ? (
          <Text
            testID={testID ? `${testID}-prefix` : undefined}
            className="border-r border-border pl-3 pr-2 text-base font-medium text-text">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          testID={testID ? `${testID}-field` : undefined}
          accessibilityLabel={label}
          accessibilityHint={error ? `Error: ${error}` : helper}
          accessibilityState={{ disabled }}
          editable={!disabled}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn('min-h-12 flex-1 px-3 text-base text-text', prefix && 'pl-2')}
          {...inputProps}
        />
      </View>
      {message ? (
        <Text
          testID={testID ? `${testID}-${error ? 'error' : 'helper'}` : undefined}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          className={cn('text-xs', error ? 'text-error' : 'text-text-muted')}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
