import { Text, View } from 'react-native';

import { Button, Sheet } from '@/components';

import { useBecomeSeller } from './use-become-seller';

type Props = { visible: boolean; onClose: () => void };

export function BecomeSellerSheet({ visible, onClose }: Props) {
  const upgrade = useBecomeSeller();
  return (
    <Sheet visible={visible} onClose={onClose} title="Become a seller" testID="become-seller-sheet">
      <View className="gap-4">
        <Text className="text-sm text-text-muted">
          Open a store and sell digital products, services or physical items. It’s free, needs no
          approval, and you can keep buying as usual. Nexa charges 5% + ₦10 per sale.
        </Text>
        <Button
          label="Yes, make me a seller"
          loading={upgrade.isPending}
          onPress={() => upgrade.mutate(undefined, { onSuccess: onClose })}
          testID="become-seller-confirm"
        />
        <Button label="Not now" variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}
