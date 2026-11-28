import type {
  Category,
  ContentMode,
  Money,
  ProductPreview,
  StoreSummary,
  Tag,
} from '@nexa/api-contract';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar, Badge, Button, PriceText } from '@/components';

import { formatBytes, formatDuration, modeWords } from './product-ui';
import { PreviewAudio, PreviewPages, PreviewVideo } from './PreviewPlayers';

export type BuyerViewProduct = {
  title: string;
  typeName: string;
  contentMode: ContentMode;
  price: Money | null;
  compareAtPrice: Money | null;
  coverUrl: string | null;
  description: string | null;
  preview: ProductPreview;
  category: Category | null;
  tags: Tag[];
  content: {
    pageCount: number | null;
    durationSeconds: number | null;
    fileSizeBytes: number | null;
    fileLabel: string | null;
  };
  store: Pick<StoreSummary, 'slug' | 'name' | 'avatarUrl' | 'verified' | 'location'> & {
    followerCount?: number;
  };
};

/**
 * What buyers see: used by the product page and by the seller's "Preview as buyer".
 * Shows only public things (cover, preview, facts), never files or the link.
 */
export function ProductBuyerView({
  product,
  onBuy,
  buyDisabled = false,
  footer,
  testID = 'buyer-view',
}: {
  product: BuyerViewProduct;
  onBuy?: () => void;
  buyDisabled?: boolean;
  footer?: React.ReactNode;
  testID?: string;
}) {
  const facts = [
    product.typeName,
    product.content.fileLabel,
    product.content.pageCount ? `${product.content.pageCount} pages` : null,
    product.content.durationSeconds ? formatDuration(product.content.durationSeconds) : null,
    product.content.fileSizeBytes ? formatBytes(product.content.fileSizeBytes) : null,
  ].filter(Boolean);

  return (
    <ScrollView contentContainerClassName="gap-4 pb-10" testID={testID}>
      {product.coverUrl ? (
        <Image
          source={{ uri: product.coverUrl }}
          contentFit="cover"
          accessibilityLabel={`Cover of ${product.title}`}
          className="w-full bg-surface-muted"
          style={{ aspectRatio: 4 / 3 }}
        />
      ) : (
        <View
          className="w-full items-center justify-center bg-surface-muted"
          style={{ aspectRatio: 4 / 3 }}>
          <Text className="text-sm text-text-muted">No cover yet</Text>
        </View>
      )}
      <View className="gap-3 px-4">
        <Text className="text-xs font-medium uppercase text-text-muted" testID={`${testID}-facts`}>
          {facts.join(' · ')}
        </Text>
        <Text accessibilityRole="header" className="text-2xl font-bold text-text">
          {product.title || 'Untitled product'}
        </Text>
        {product.price ? (
          <PriceText
            amountKobo={product.price.amountKobo}
            compareAtKobo={product.compareAtPrice?.amountKobo}
            size="xl"
          />
        ) : (
          <Text className="text-base text-text-muted">No price yet</Text>
        )}
        <Button
          label="Buy"
          onPress={onBuy}
          disabled={buyDisabled || !onBuy}
          fullWidth
          testID={`${testID}-buy`}
        />
        <Text className="text-xs text-text-muted">{modeWords[product.contentMode].buyer}</Text>
        {product.description ? (
          <Text className="text-base text-text">{product.description}</Text>
        ) : null}

        {product.preview.pages.length ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-text">Preview</Text>
            <PreviewPages pages={product.preview.pages} testID={`${testID}-pages`} />
          </View>
        ) : null}
        {product.preview.clipUrl && product.preview.clipKind === 'video' ? (
          <PreviewVideo uri={product.preview.clipUrl} testID={`${testID}-video`} />
        ) : null}
        {product.preview.clipUrl && product.preview.clipKind === 'audio' ? (
          <PreviewAudio uri={product.preview.clipUrl} testID={`${testID}-audio`} />
        ) : null}

        <Pressable
          onPress={() =>
            router.push({ pathname: '/store/[slug]', params: { slug: product.store.slug } })
          }
          accessibilityRole="button"
          accessibilityLabel={`Sold by ${product.store.name}. Visit store`}
          className="flex-row items-center gap-3 rounded-lg border border-border p-3 active:bg-surface-muted"
          testID={`${testID}-store`}>
          <Avatar
            name={product.store.name}
            uri={product.store.avatarUrl}
            ring={product.store.verified}
          />
          <View className="flex-1">
            <Text className="text-base font-semibold text-text">{product.store.name}</Text>
            <Text className="text-sm text-text-muted">
              {[
                product.store.location,
                product.store.followerCount !== undefined
                  ? `${product.store.followerCount.toLocaleString('en-NG')} followers`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Visit store'}
            </Text>
          </View>
        </Pressable>

        {product.category || product.tags.length ? (
          <View className="flex-row flex-wrap gap-2" testID={`${testID}-tags`}>
            {product.category ? <Badge label={product.category.name} variant="chrome" /> : null}
            {product.tags.map((t) => (
              <Badge key={t.slug} label={`#${t.name}`} />
            ))}
          </View>
        ) : null}
        {footer}
      </View>
    </ScrollView>
  );
}
