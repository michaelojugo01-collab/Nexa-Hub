import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button, Sheet } from '@/components';
import { logger } from '@/lib/logger';
import { storeLinkLabel, storeUrl } from '@/lib/store-links';
import { toast } from '@/stores/toast-store';
import { useTheme } from '@/theme/ThemeProvider';

type ShareStoreSheetProps = {
  visible: boolean;
  onClose: () => void;
  store: { name: string; slug: string };
};

/** The part of react-native-svg's Svg instance we use (getRef gives us the Svg). */
type SvgRef = { toDataURL: (callback: (base64: string) => void) => void };

const QR_SIZE = 200;

/**
 * Share a store: copy the link, the OS share sheet (WhatsApp, Instagram, SMS…), and a QR code
 * that can be shared or saved as an image (the OS sheet offers "Save image" / "Save to Files").
 */
export function ShareStoreSheet({ visible, onClose, store }: ShareStoreSheetProps) {
  const { colors } = useTheme();
  const qr = useRef<SvgRef | null>(null);
  const [sharingQr, setSharingQr] = useState(false);
  const url = storeUrl(store.slug);
  const message = `Check out ${store.name} on Nexa Hub: ${url}`;

  async function copy() {
    await Clipboard.setStringAsync(url);
    toast.show('Link copied', 'success');
  }

  async function shareLink() {
    try {
      // iOS shows the url as a rich link; Android only reads `message`.
      await Share.share(
        Platform.select({
          ios: { message: `Check out ${store.name} on Nexa Hub`, url },
          default: { message },
        }),
        { dialogTitle: `Share ${store.name}` },
      );
    } catch (error) {
      logger.warn('Share failed', error);
      toast.show('Couldn’t open sharing. Copy the link instead.', 'error');
    }
  }

  async function shareQr() {
    if (!qr.current) return;
    setSharingQr(true);
    try {
      const base64 = await new Promise<string>((resolve) => qr.current!.toDataURL(resolve));
      const file = new File(Paths.cache, `nexa-${store.slug}-qr.png`);
      if (file.exists) file.delete();
      file.create();
      await file.write(base64, { encoding: 'base64' });
      if (!(await Sharing.isAvailableAsync())) {
        toast.show('Sharing isn’t available on this device.', 'error');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: `${store.name} QR code`,
      });
    } catch (error) {
      logger.warn('QR share failed', error);
      toast.show('Couldn’t share the QR code. Please try again.', 'error');
    } finally {
      setSharingQr(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Share your store" testID="share-sheet">
      <View className="gap-4">
        <Pressable
          onPress={copy}
          accessibilityRole="button"
          accessibilityLabel={`Copy link ${storeLinkLabel(store.slug)}`}
          testID="share-copy"
          className="flex-row items-center justify-between rounded-md border border-border bg-surface-muted px-4 py-3 active:bg-border">
          <Text className="flex-1 text-base font-medium text-text" numberOfLines={1}>
            {storeLinkLabel(store.slug)}
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="copy-outline" size={18} color={colors.text} accessible={false} />
            <Text className="text-sm font-semibold text-text">Copy</Text>
          </View>
        </Pressable>

        <Button
          label="Share link"
          onPress={shareLink}
          icon={<Ionicons name="share-outline" size={18} color={colors.textInverse} />}
          fullWidth
          accessibilityHint="Opens your phone’s share options, like WhatsApp or Instagram"
          testID="share-native"
        />

        <View className="items-center gap-3 rounded-md border border-border p-4">
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`QR code for ${storeLinkLabel(store.slug)}`}
            testID="share-qr">
            <QRCode
              value={url}
              size={QR_SIZE}
              color={colors.text}
              backgroundColor={colors.surface}
              quietZone={12}
              ecl="M"
              getRef={(ref: SvgRef | null) => {
                qr.current = ref;
              }}
            />
          </View>
          <Text className="text-center text-xs text-text-muted">
            Print it or put it on your flyers. Scanning opens your store.
          </Text>
          <Button
            label="Share or save QR image"
            variant="secondary"
            size="sm"
            loading={sharingQr}
            onPress={shareQr}
            testID="share-qr-image"
          />
        </View>
      </View>
    </Sheet>
  );
}
