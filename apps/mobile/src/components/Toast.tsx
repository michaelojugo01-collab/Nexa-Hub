import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { useToastStore, type ToastVariant } from '@/stores/toast-store';
import { useTheme } from '@/theme/ThemeProvider';

const DURATION_MS = 3500;

const icons = {
  info: 'information-circle',
  success: 'checkmark-circle',
  error: 'alert-circle',
} as const;

type ToastViewProps = {
  message: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
  className?: string;
  testID?: string;
};

/** The toast card itself. Use `toast.show()` to display one; this is exported for the gallery. */
export function Toast({ message, variant = 'info', onDismiss, className, testID }: ToastViewProps) {
  const { colors } = useTheme();
  const iconColor =
    variant === 'success' ? colors.success : variant === 'error' ? colors.error : colors.accent;

  return (
    <Pressable
      testID={testID}
      onPress={onDismiss}
      accessibilityRole="alert"
      accessibilityLabel={message}
      accessibilityHint={onDismiss ? 'Tap to dismiss' : undefined}
      className={cn('flex-row items-center gap-3 rounded-md bg-primary px-4 py-3', className)}>
      <Ionicons name={icons[variant]} size={20} color={iconColor} accessible={false} />
      <Text className="flex-1 text-sm text-text-inverse">{message}</Text>
    </Pressable>
  );
}

/** Renders the current toast from the store. Mounted once in the root layout. */
export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(hide, DURATION_MS);
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ top: insets.top + 8 }}
      className="absolute left-4 right-4">
      <Toast
        key={current.id}
        message={current.message}
        variant={current.variant}
        onDismiss={hide}
        testID="toast"
      />
    </View>
  );
}
