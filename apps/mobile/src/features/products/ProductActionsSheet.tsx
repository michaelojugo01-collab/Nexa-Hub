import type { OwnProduct } from '@nexa/api-contract';
import { router } from 'expo-router';
import { Alert, Platform, View } from 'react-native';

import { Button, Sheet } from '@/components';
import { errorMessage } from '@/lib/api/error-message';
import { toast } from '@/stores/toast-store';

import { useRepublishProduct, useUnpublishProduct } from './use-product-actions';

/** Edit, Unpublish (with confirmation), Republish, Share, View. */
export function ProductActionsSheet({
  product,
  onClose,
  onShare,
}: {
  product: OwnProduct | null;
  onClose: () => void;
  onShare: (product: OwnProduct) => void;
}) {
  const unpublish = useUnpublishProduct();
  const republish = useRepublishProduct();
  if (!product) return null;
  const isLive = product.state === 'live' || product.state === 'pending_review';

  function edit() {
    onClose();
    router.push({ pathname: '/seller/products/[id]', params: { id: product!.id } });
  }

  function doUnpublish() {
    unpublish.mutate(product!.id, {
      onSuccess: () => {
        toast.show('Unpublished. People who bought it keep access.', 'success');
        onClose();
      },
      onError: (e) => toast.show(errorMessage(e), 'error'),
    });
  }

  function confirmUnpublish() {
    const message =
      'It disappears from your store, Nexa Hub and search. People who already bought it keep access in their library. You can republish it any time.';
    if (Platform.OS === 'web') return doUnpublish();
    Alert.alert('Unpublish this product?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unpublish', style: 'destructive', onPress: doUnpublish },
    ]);
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title={product.title || 'Untitled product'}
      testID="product-actions">
      <View className="gap-2">
        <Button
          label="Edit"
          variant="secondary"
          onPress={edit}
          fullWidth
          testID="product-action-edit"
        />
        {product.state === 'live' ? (
          <Button
            label="Share"
            variant="secondary"
            onPress={() => {
              onClose();
              onShare(product);
            }}
            fullWidth
            testID="product-action-share"
          />
        ) : null}
        {product.state === 'live' ? (
          <Button
            label="View as buyer"
            variant="secondary"
            onPress={() => {
              onClose();
              router.push({
                pathname: '/product/[store]/[product]',
                params: { store: product.store.slug, product: product.slug },
              });
            }}
            fullWidth
            testID="product-action-view"
          />
        ) : null}
        {isLive ? (
          <Button
            label="Unpublish"
            variant="ghost"
            onPress={confirmUnpublish}
            loading={unpublish.isPending}
            fullWidth
            testID="product-action-unpublish"
          />
        ) : null}
        {product.state === 'unpublished' ? (
          <Button
            label="Republish"
            onPress={() =>
              republish.mutate(product.id, {
                onSuccess: () => {
                  toast.show('Back on sale', 'success');
                  onClose();
                },
                onError: (e) => toast.show(errorMessage(e), 'error'),
              })
            }
            loading={republish.isPending}
            fullWidth
            testID="product-action-republish"
          />
        ) : null}
      </View>
    </Sheet>
  );
}
