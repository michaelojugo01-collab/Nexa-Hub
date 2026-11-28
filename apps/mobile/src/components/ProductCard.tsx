import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { speakKobo } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

import { Badge } from './Badge';
import { PriceText } from './PriceText';

type ProductCardProps = {
  title: string;
  storeName: string;
  priceKobo: number;
  compareAtKobo?: number | null;
  imageUrl?: string | null;
  /** e.g. "Ebook", "Course" — shown as a small label */
  typeLabel?: string;
  featured?: boolean;
  onPress?: () => void;
  /** 'grid' fills its column; 'row' is a compact horizontal layout */
  layout?: 'grid' | 'row';
  className?: string;
  testID?: string;
};

export function ProductCard({
  title,
  storeName,
  priceKobo,
  compareAtKobo,
  imageUrl,
  typeLabel,
  featured = false,
  onPress,
  layout = 'grid',
  className,
  testID,
}: ProductCardProps) {
  const { colors } = useTheme();
  const a11yLabel = `${title} by ${storeName}, ${speakKobo(priceKobo)}${featured ? ', featured' : ''}`;

  const image = imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      contentFit="cover"
      transition={150}
      accessible={false}
      className={cn(
        'bg-surface-muted',
        layout === 'grid' ? 'aspect-square w-full' : 'h-20 w-20 rounded-md',
      )}
    />
  ) : (
    <View
      className={cn(
        'items-center justify-center bg-surface-muted',
        layout === 'grid' ? 'aspect-square w-full' : 'h-20 w-20 rounded-md',
      )}>
      <Ionicons name="image-outline" size={24} color={colors.textSubtle} accessible={false} />
    </View>
  );

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={a11yLabel}
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface active:opacity-80',
        layout === 'row' && 'flex-row items-center gap-3 p-2',
        className,
      )}>
      <View>
        {image}
        {featured && layout === 'grid' ? (
          <Badge label="Featured" variant="chrome" className="absolute left-2 top-2" />
        ) : null}
      </View>
      <View className={cn('gap-1', layout === 'grid' ? 'p-3' : 'flex-1')}>
        {typeLabel ? (
          <Text className="text-xs font-medium uppercase text-text-subtle">{typeLabel}</Text>
        ) : null}
        <Text className="text-sm font-semibold text-text" numberOfLines={2}>
          {title}
        </Text>
        <Text className="text-xs text-text-muted" numberOfLines={1}>
          {storeName}
        </Text>
        <PriceText amountKobo={priceKobo} compareAtKobo={compareAtKobo} size="sm" />
      </View>
    </Pressable>
  );
}
