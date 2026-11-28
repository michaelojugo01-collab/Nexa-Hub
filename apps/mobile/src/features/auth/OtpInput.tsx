import { useRef, type ComponentRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { cn } from '@/lib/cn';

export const OTP_LENGTH = 6;

type OtpInputProps = {
  value: string;
  /** Number of digits (default 6; the app-lock PIN uses 4) */
  length?: number;
  /** Show dots instead of digits (PIN entry) */
  secure?: boolean;
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  testID?: string;
};

/**
 * Six visual boxes backed by one real TextInput, so paste and OS one-time-code autofill
 * (iOS `oneTimeCode`, Android `sms-otp`) fill every box at once.
 */
export function OtpInput({
  value,
  length = OTP_LENGTH,
  secure = false,
  onChange,
  disabled,
  error,
  autoFocus = true,
  testID,
}: OtpInputProps) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const digits = value.split('');
  const active = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      disabled={disabled}
      accessible={false}
      className="relative">
      <View
        className="flex-row justify-between gap-2"
        importantForAccessibility="no-hide-descendants">
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            className={cn(
              'h-14 flex-1 items-center justify-center rounded-md border bg-surface',
              error
                ? 'border-error'
                : !disabled && i === active
                  ? 'border-text'
                  : digits[i]
                    ? 'border-border-strong'
                    : 'border-border',
              disabled && 'bg-surface-muted opacity-60',
            )}>
            <Text className="text-2xl font-semibold text-text">
              {digits[i] ? (secure ? '•' : digits[i]) : ''}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={input}
        testID={testID}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType={secure ? 'none' : 'oneTimeCode'}
        autoComplete={secure ? 'off' : 'sms-otp'}
        secureTextEntry={secure}
        maxLength={length}
        caretHidden
        accessibilityLabel={secure ? `${length}-digit PIN` : `${length}-digit code`}
        accessibilityHint={value ? `${value.length} of ${length} digits entered` : undefined}
        accessibilityState={{ disabled }}
        className="absolute inset-0 text-transparent opacity-0"
      />
    </Pressable>
  );
}
