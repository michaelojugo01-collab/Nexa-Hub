import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Leave false for screens that render their own list. */
  scroll?: boolean;
  /** Safe-area edges to pad. Tab screens skip 'bottom' because the tab bar handles it. */
  edges?: Edge[];
  /** Adds the standard horizontal page padding. */
  padded?: boolean;
  className?: string;
  testID?: string;
  accessibilityLabel?: string;
};

/** Safe-area page wrapper. Every screen starts with this. */
export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  padded = true,
  className,
  testID,
  accessibilityLabel,
}: ScreenProps) {
  const inner = cn('flex-1', padded && 'px-4', className);

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg" testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerClassName={cn(padded && 'px-4', 'pb-8', className)}
          accessibilityLabel={accessibilityLabel}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View className={inner} accessibilityLabel={accessibilityLabel}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
