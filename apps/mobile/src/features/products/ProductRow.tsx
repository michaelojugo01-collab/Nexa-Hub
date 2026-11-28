import Ionicons from '@expo/vector-icons/Ionicons';
import type { OwnProduct } from '@nexa/api-contract';
import { formatKobo } from '@nexa/ui';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { Badge } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

import { assetWords, stateBadge } from './product-ui';
import { useUploadJob } from './use-product-upload';

/** One row of the seller's product list. */
export function ProductRow({
  product,
  onPress,
  onMore,
}: {
  product: OwnProduct;
  onPress: () => void;
  onMore: () => void;
}) {
  const { colors } = useTheme();
  const job = useUploadJob(product.id, 'main');
  const main = product.assets.find((a) => a.id === product.mainAssetId);
  const uploading = job && !['done', 'cancelled'].includes(job.status);
  const upload = uploading
    ? job.status === 'failed' || job.status === 'paused'
      ? `Upload ${job.status} at ${Math.round((job.sentBytes / Math.max(1, job.sizeBytes)) * 100)}%`
      : `Uploading ${Math.round((job.sentBytes / Math.max(1, job.sizeBytes)) * 100)}%`
    : main && main.status !== 'ready'
      ? main.status === 'rejected'
        ? 'File rejected'
        : assetWords[main.status]
      : null;
  const badge = stateBadge[product.state];

  return (
    <View
      className="flex-row items-center gap-3 border-b border-border py-3"
      testID={`product-row-${product.id}`}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${product.title || 'untitled product'}`}
        className="flex-1 flex-row items-center gap-3">
        {product.coverUrl ? (
          <Image
            source={{ uri: product.coverUrl }}
            contentFit="cover"
            className="h-14 w-16 rounded-md bg-surface-muted"
            accessible={false}
          />
        ) : (
          <View className="h-14 w-16 items-center justify-center rounded-md bg-surface-muted">
            <Ionicons name="image-outline" size={20} color={colors.textMuted} />
          </View>
        )}
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-text" numberOfLines={1}>
            {product.title || 'Untitled product'}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge
              label={badge.label}
              variant={badge.variant}
              testID={`product-row-${product.id}-state`}
            />
            {product.visibility === 'unlisted' && product.state !== 'draft' ? (
              <Badge label="Unlisted" />
            ) : null}
            <Text className="text-xs text-text-muted">
              {product.price ? formatKobo(product.price.amountKobo) : 'No price'} ·{' '}
              {product.salesCount} sold
            </Text>
          </View>
          {upload ? (
            <Text
              className={
                upload.includes('rejected') ? 'text-xs text-error' : 'text-xs text-text-muted'
              }
              testID={`product-row-${product.id}-upload`}>
              {upload}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${product.title || 'this product'}`}
        hitSlop={8}
        testID={`product-row-${product.id}-more`}
        className="px-2 py-2">
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}
