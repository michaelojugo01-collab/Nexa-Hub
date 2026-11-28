import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';

type SkeletonProps = {
  /** Size and shape via classes, e.g. "h-4 w-32 rounded-sm" */
  className?: string;
  testID?: string;
};

/** Pulsing placeholder block shown while content loads. */
export function Skeleton({ className, testID }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID={testID}
      style={animatedStyle}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View className={cn('rounded-md bg-surface-muted', className)} />
    </Animated.View>
  );
}
