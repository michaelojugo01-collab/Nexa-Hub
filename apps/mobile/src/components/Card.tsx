import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

type CardProps = {
  children: ReactNode;
  /** Makes the whole card pressable */
  onPress?: () => void;
  /** Removes the inner padding (e.g. for edge-to-edge images) */
  flush?: boolean;
  className?: string;
  testID?: string;
  /** Required for pressable cards so screen readers announce the target */
  accessibilityLabel?: string;
};

export function Card({
  children,
  onPress,
  flush = false,
  className,
  testID,
  accessibilityLabel,
}: CardProps) {
  const classes = cn(
    'overflow-hidden rounded-lg border border-border bg-surface',
    !flush && 'p-4',
    className,
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={cn(classes, 'active:opacity-80')}>
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} className={classes}>
      {children}
    </View>
  );
}
