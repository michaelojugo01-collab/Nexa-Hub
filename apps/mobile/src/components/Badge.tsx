import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

import { ChromeGradient } from './internal/ChromeGradient';

export type BadgeVariant = 'neutral' | 'chrome' | 'inverse' | 'success' | 'warning' | 'error';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  testID?: string;
  accessibilityLabel?: string;
};

const styles: Record<Exclude<BadgeVariant, 'chrome'>, { box: string; text: string }> = {
  neutral: { box: 'bg-surface-muted', text: 'text-text' },
  inverse: { box: 'bg-primary', text: 'text-text-inverse' },
  success: { box: 'bg-success-bg', text: 'text-success' },
  warning: { box: 'bg-warning-bg', text: 'text-warning' },
  error: { box: 'bg-error-bg', text: 'text-error' },
};

/** Small status label. `chrome` has the metallic shine — use it for featured / verified. */
export function Badge({
  label,
  variant = 'neutral',
  className,
  testID,
  accessibilityLabel,
}: BadgeProps) {
  const a11y = {
    testID,
    accessible: true,
    accessibilityLabel: accessibilityLabel ?? label,
  };
  const textClass = 'text-xs font-semibold';

  if (variant === 'chrome') {
    return (
      <View {...a11y} className={cn('self-start overflow-hidden rounded-full', className)}>
        <ChromeGradient className="px-2 py-0.5">
          <Text className={cn(textClass, 'text-text')}>{label}</Text>
        </ChromeGradient>
      </View>
    );
  }

  const s = styles[variant];
  return (
    <View {...a11y} className={cn('self-start rounded-full px-2 py-0.5', s.box, className)}>
      <Text className={cn(textClass, s.text)}>{label}</Text>
    </View>
  );
}
