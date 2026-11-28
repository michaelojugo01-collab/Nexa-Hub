import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { ThemeScope } from '@/theme/ThemeProvider';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  testID?: string;
};

/** Bottom sheet. Tapping the backdrop or the Android back button closes it. */
export function Sheet({ visible, onClose, title, children, className, testID }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <ThemeScope>
        <View className="flex-1 justify-end">
          <Pressable
            testID={testID ? `${testID}-backdrop` : undefined}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="absolute inset-0 bg-overlay"
          />
          <View
            testID={testID}
            accessibilityViewIsModal
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            className={cn('rounded-t-xl bg-surface px-4 pt-2', className)}>
            <View className="mb-3 items-center">
              <View className="h-1 w-10 rounded-full bg-border-strong" />
            </View>
            {title ? (
              <Text accessibilityRole="header" className="mb-3 text-lg font-semibold text-text">
                {title}
              </Text>
            ) : null}
            {children}
          </View>
        </View>
      </ThemeScope>
    </Modal>
  );
}
