import type { OwnProduct, ProductTypeDef } from '@nexa/api-contract';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { Button } from '@/components';
import { InlineNotice } from '@/features/auth/InlineNotice';
import { ImageCropper } from '@/features/stores/images/ImageCropper';
import { pickImage, type PickedImage } from '@/features/stores/images/pick-image';
import { prepareImage } from '@/features/stores/images/prepare-image';
import { Image } from 'expo-image';

import { assetWords, formatBytes, formatDuration } from './product-ui';
import { UploadProgress } from './UploadProgress';
import { useProductUpload } from './use-product-upload';

export const COVER_SIZE = { width: 1200, height: 900 };

const extOf = (name: string) => name.toLowerCase().split('.').pop() ?? '';

function AssetStatusLine({
  product,
  assetId,
  testID,
}: {
  product: OwnProduct;
  assetId: string | null;
  testID: string;
}) {
  const asset = product.assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const facts = [
    formatBytes(asset.sizeBytes),
    asset.pageCount ? `${asset.pageCount} pages` : null,
    asset.durationSeconds ? formatDuration(asset.durationSeconds) : null,
  ].filter(Boolean);
  return (
    <View className="gap-1 rounded-lg border border-border p-3" testID={testID}>
      <Text className="text-sm font-medium text-text" numberOfLines={1}>
        {asset.fileName}
      </Text>
      <Text
        className={asset.status === 'rejected' ? 'text-sm text-error' : 'text-sm text-text-muted'}
        accessibilityLiveRegion="polite"
        testID={`${testID}-status`}>
        {asset.status === 'rejected'
          ? `Rejected: ${asset.rejectionReason ?? 'this file can’t be sold.'}`
          : `${assetWords[asset.status]}${asset.status === 'ready' ? ` · ${facts.join(' · ')}` : ''}`}
      </Text>
    </View>
  );
}

/** The file buyers get (DOWNLOAD_LIMITED / STREAM_ONLY), with upload progress and status. */
export function MainFileField({ product, type }: { product: OwnProduct; type: ProductTypeDef }) {
  const upload = useProductUpload(product, 'main');
  const [problem, setProblem] = useState<string | null>(null);
  const rules = type.files;
  const job = upload.job && upload.job.status !== 'done' ? upload.job : undefined;
  const current = product.assets.find((a) => a.id === product.mainAssetId);

  async function choose() {
    if (!rules) return;
    setProblem(null);
    if (product.state !== 'draft' && current) {
      const go =
        Platform.OS === 'web' ||
        (await new Promise<boolean>((resolve) =>
          Alert.alert(
            'Replace the file?',
            'Everyone who bought this will get the new file. The old one stays available to them for 30 days. If it’s a different product, create a new one instead.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Replace', onPress: () => resolve(true) },
            ],
          ),
        ));
      if (!go) return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: rules.contentTypes,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    const size = file.size ?? 0;
    if (!rules.extensions.includes(extOf(file.name))) {
      setProblem(`That file type can’t be sold here. Use ${rules.label.split(', up to')[0]}.`);
      return;
    }
    if (size > rules.maxBytes) {
      setProblem(
        `That file is too big (${formatBytes(size)}). The limit is ${rules.label.split('up to ')[1]}.`,
      );
      return;
    }
    await upload.start({
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType ?? 'application/octet-stream',
      size,
    });
  }

  if (!rules) return null;
  return (
    <View className="gap-3" testID="main-file">
      <Text className="text-sm text-text-muted">{rules.label}</Text>
      {job ? (
        <UploadProgress
          job={job}
          onPause={upload.pause}
          onResume={upload.resume}
          onCancel={upload.cancel}
          testID="main-upload"
        />
      ) : (
        <AssetStatusLine product={product} assetId={product.mainAssetId} testID="main-asset" />
      )}
      {problem ? <InlineNotice tone="error" message={problem} testID="main-file-problem" /> : null}
      {!job ? (
        <Button
          label={
            current
              ? current.status === 'rejected'
                ? 'Upload a different file'
                : 'Replace file'
              : 'Choose file'
          }
          variant={current && current.status !== 'rejected' ? 'secondary' : 'primary'}
          onPress={() => void choose()}
          testID="main-file-choose"
        />
      ) : null}
    </View>
  );
}

/** An optional short preview clip (video or audio types). */
export function PreviewClipField({
  product,
  kind,
}: {
  product: OwnProduct;
  kind: 'video' | 'audio';
}) {
  const upload = useProductUpload(product, 'preview');
  const job = upload.job && upload.job.status !== 'done' ? upload.job : undefined;

  async function choose() {
    const result = await DocumentPicker.getDocumentAsync({
      type: kind === 'video' ? ['video/mp4', 'video/quicktime'] : ['audio/mpeg', 'audio/wav'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    await upload.start({
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType ?? (kind === 'video' ? 'video/mp4' : 'audio/mpeg'),
      size: file.size ?? 0,
    });
  }

  return (
    <View className="gap-2" testID="preview-clip">
      <Text className="text-sm text-text-muted">
        {kind === 'video'
          ? 'A short clip, up to 1 minute (MP4 or MOV).'
          : 'A short clip, up to 30 seconds (MP3 or WAV).'}
      </Text>
      {job ? (
        <UploadProgress
          job={job}
          onPause={upload.pause}
          onResume={upload.resume}
          onCancel={upload.cancel}
          testID="preview-upload"
        />
      ) : (
        <AssetStatusLine
          product={product}
          assetId={product.previewAssetId}
          testID="preview-asset"
        />
      )}
      {!job ? (
        <Button
          label={product.previewAssetId ? 'Replace clip' : 'Add a preview clip'}
          variant="secondary"
          onPress={() => void choose()}
          testID="preview-clip-choose"
        />
      ) : null}
    </View>
  );
}

/** Cover: pick, crop 4:3 (F2 crop screen), shrink and compress, upload. */
export function CoverField({ product }: { product: OwnProduct }) {
  const upload = useProductUpload(product, 'cover');
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const job = upload.job && upload.job.status !== 'done' ? upload.job : undefined;

  async function choose() {
    setProblem(null);
    const result = await pickImage();
    if (result.status === 'unsupported') setProblem('Use a JPEG, PNG or WebP photo.');
    if (result.status === 'picked') setPicked(result.image);
  }

  return (
    <View className="gap-3" testID="cover-field">
      <View
        className="w-full overflow-hidden rounded-lg bg-surface-muted"
        style={{ aspectRatio: 4 / 3 }}>
        {product.coverUrl ? (
          <Image
            source={{ uri: product.coverUrl }}
            contentFit="cover"
            className="h-full w-full"
            accessible={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-text-muted">4:3 cover image</Text>
          </View>
        )}
      </View>
      {job ? (
        <UploadProgress
          job={job}
          onPause={upload.pause}
          onResume={upload.resume}
          onCancel={upload.cancel}
          testID="cover-upload"
        />
      ) : null}
      {problem ? <InlineNotice tone="error" message={problem} testID="cover-problem" /> : null}
      {!job ? (
        <Button
          label={product.coverUrl ? 'Change cover' : 'Add cover'}
          variant={product.coverUrl ? 'secondary' : 'primary'}
          onPress={() => void choose()}
          testID="cover-choose"
        />
      ) : null}
      {picked ? (
        <ImageCropper
          visible
          image={picked}
          aspect={4 / 3}
          title="Crop cover"
          onCancel={() => setPicked(null)}
          onDone={async (rect) => {
            const source = picked;
            setPicked(null);
            try {
              const image = await prepareImage(source.uri, rect, COVER_SIZE);
              await upload.start({
                uri: image.uri,
                name: 'cover.jpg',
                mimeType: 'image/jpeg',
                size: image.sizeBytes,
              });
            } catch {
              setProblem('We couldn’t open that image. Try another one.');
            }
          }}
          testID="cover-cropper"
        />
      ) : null}
    </View>
  );
}
