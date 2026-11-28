import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthScreenProps = {
  children: ReactNode;
  /** Pinned to the bottom, above the keyboard (primary action) */
  footer?: ReactNode;
  testID?: string;
};

/** Layout for sign-in and onboarding: scrollable content, bottom action, keyboard-aware. */
export function AuthScreen({ children, footer, testID }: AuthScreenProps) {
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg" testID={testID}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow px-4 pb-6"
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View className="gap-3 px-4 pb-4 pt-2">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
