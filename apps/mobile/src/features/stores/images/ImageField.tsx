import Ionicons from '@expo/vector-icons/Ionicons';
import type { UploadKind } from '@nexa/api-contract';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button } from '@/components';
import { cn } from '@/lib/cn';
import { uploadLimits } from '@/lib/upload-limits';
import { useTheme } from '@/theme/ThemeProvider';

import type { CropRect } from './crop-math';
import { ImageCropper } from './ImageCropper';
import { pickImage, type PickedImage } from './pick-image';
import type { ImageUploadState } from './use-image-upload';

type ImageFieldProps = {
  kind: UploadKind;
  label: string;
  state: ImageUploadState;
  /** The store's current image (edit screen), shown when nothing new was picked. */
  currentUri?: string | null;
  onPicked: (uri: string, crop: CropRect) => void;
  onRetry: () => void;
  onRemove: () => void;
  /** Edit screen: remove the store's current image (sent as null on save). */
  onRemoveCurrent?: () => void;
  testID: string;
};

const ASPECT: Record<UploadKind, number> = { avatar: 1, banner: 3 };

/** Pick → crop → (parent uploads) with preview, progress, failure + retry, and remove. */
export function ImageField({
  kind,
  label,
  state,
  currentUri,
  onPicked,
  onRetry,
  onRemove,
  onRemoveCurrent,
  testID,
}: ImageFieldProps) {
  const { colors } = useTheme();
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const previewUri = state.status === 'empty' ? currentUri : state.localUri;
  const busy = state.status === 'preparing' || state.status === 'uploading';
  const progress = state.status === 'uploading' ? state.progress : 0;

  async function choose() {
    setPickError(null);
    const result = await pickImage();
    if (result.status === 'unsupported') setPickError('Use a JPEG, PNG or WebP photo.');
    if (result.status === 'picked') setPicked(result.image);
  }

  const status = (() => {
    switch (state.status) {
      case 'preparing':
        return 'Preparing…';
      case 'uploading':
        return `Uploading… ${Math.round(progress * 100)}%`;
      case 'uploaded':
        return '✓ Uploaded';
      default:
        return `JPEG, PNG or WebP, up to ${uploadLimits[kind].label}`;
    }
  })();

  return (
    <View className="gap-2" testID={testID}>
      <Text className="text-sm font-medium text-text">{label}</Text>
      <Pressable
        onPress={busy ? undefined : choose}
        accessibilityRole="button"
        accessibilityLabel={
          previewUri ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`
        }
        accessibilityState={{ busy }}
        testID={`${testID}-pick`}
        className={cn(
          'items-center justify-center overflow-hidden border border-dashed border-border-strong bg-surface-muted',
          kind === 'avatar' ? 'h-24 w-24 rounded-full' : 'w-full rounded-md',
        )}
        style={kind === 'banner' ? { aspectRatio: ASPECT.banner } : undefined}>
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            contentFit="cover"
            accessible={false}
            className="h-full w-full"
          />
        ) : (
          <Ionicons name="image-outline" size={28} color={colors.textMuted} accessible={false} />
        )}
        {busy ? (
          <View className="absolute inset-0 items-center justify-center bg-overlay">
            <ActivityIndicator color={colors.textInverse} />
          </View>
        ) : null}
      </Pressable>

      {state.status === 'uploading' ? (
        <View
          className="h-1 w-full overflow-hidden rounded-full bg-surface-muted"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          testID={`${testID}-progress`}>
          <View className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
        </View>
      ) : null}

      {state.status === 'failed' ? (
        <View className="gap-2">
          <Text className="text-sm text-error" accessibilityLiveRegion="polite">
            {state.message}
          </Text>
          <View className="flex-row gap-2">
            {state.canRetry ? (
              <Button label="Retry" size="sm" onPress={onRetry} testID={`${testID}-retry`} />
            ) : null}
            <Button
              label={state.canRetry ? 'Remove' : 'Choose another'}
              size="sm"
              variant="secondary"
              onPress={state.canRetry ? onRemove : choose}
              testID={`${testID}-remove`}
            />
          </View>
        </View>
      ) : (
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-text-muted" accessibilityLiveRegion="polite">
            {pickError ?? status}
          </Text>
          {state.status === 'empty' && currentUri && onRemoveCurrent ? (
            <Button
              label="Remove"
              size="sm"
              variant="ghost"
              onPress={onRemoveCurrent}
              testID={`${testID}-remove-current`}
            />
          ) : null}
          {state.status === 'uploaded' ? (
            <Button
              label="Remove"
              size="sm"
              variant="ghost"
              onPress={onRemove}
              testID={`${testID}-remove`}
            />
          ) : null}
        </View>
      )}

      {picked ? (
        <ImageCropper
          visible
          image={picked}
          aspect={ASPECT[kind]}
          title={kind === 'avatar' ? 'Crop profile picture' : 'Crop banner'}
          onCancel={() => setPicked(null)}
          onDone={(rect) => {
            setPicked(null);
            onPicked(picked.uri, rect);
          }}
          testID={`${testID}-cropper`}
        />
      ) : null}
    </View>
  );
}
