import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type ChromeGradientProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
};

/** The metallic chrome shine from the design tokens. Internal building block, not a public component. */
export function ChromeGradient({ className, style, children, testID }: ChromeGradientProps) {
  const { chromeGradient } = useTheme();
  return (
    <LinearGradient
      testID={testID}
      colors={chromeGradient.colors}
      locations={chromeGradient.locations}
      start={chromeGradient.start}
      end={chromeGradient.end}
      className={className}
      style={style}>
      {children}
    </LinearGradient>
  );
}
