import { Text } from 'react-native';

import { cn } from '@/lib/cn';
import { formatKobo, speakKobo } from '@/lib/money';

type PriceTextProps = {
  /** Integer kobo from the server. Never a decimal. */
  amountKobo: number;
  /** Shows a struck-through original price before the current one. */
  compareAtKobo?: number | null;
  size?: 'sm' | 'base' | 'lg' | 'xl';
  alwaysShowKobo?: boolean;
  className?: string;
  testID?: string;
};

const sizes = { sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-2xl' } as const;

/** Displays an NGN amount the server returned. Does no maths beyond formatting. */
export function PriceText({
  amountKobo,
  compareAtKobo,
  size = 'base',
  alwaysShowKobo,
  className,
  testID,
}: PriceTextProps) {
  const hasCompare = compareAtKobo != null && compareAtKobo > amountKobo;
  const label = hasCompare
    ? `${speakKobo(amountKobo)}, was ${speakKobo(compareAtKobo)}`
    : speakKobo(amountKobo);

  return (
    <Text
      testID={testID}
      accessibilityLabel={label}
      className={cn('font-semibold text-text', sizes[size], className)}>
      {hasCompare ? (
        <Text className="font-normal text-text-subtle line-through">
          {formatKobo(compareAtKobo, { alwaysShowKobo })}{' '}
        </Text>
      ) : null}
      {formatKobo(amountKobo, { alwaysShowKobo })}
    </Text>
  );
}
