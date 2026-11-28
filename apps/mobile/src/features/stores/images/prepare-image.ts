import type { UploadKind } from '@nexa/api-contract';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { CropRect } from './crop-math';

/**
 * Crops, shrinks and compresses on the phone before upload, so sellers on slow or metered
 * networks send a few hundred KB instead of a 5–10 MB camera photo.
 */
export const outputSize: Record<UploadKind, { width: number; height: number }> = {
  avatar: { width: 800, height: 800 },
  banner: { width: 1500, height: 500 },
};

const JPEG_QUALITY = 0.8;

export type PreparedImage = {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: 'image/jpeg';
};

export async function prepareImage(
  uri: string,
  crop: CropRect,
  kind: UploadKind,
): Promise<PreparedImage> {
  const target = outputSize[kind];
  const context = ImageManipulator.manipulate(uri).crop(crop);
  // Never upscale a small crop.
  if (crop.width > target.width) context.resize({ width: target.width });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  let sizeBytes = 0;
  try {
    sizeBytes = new File(result.uri).size;
  } catch {
    // Unknown size (e.g. web): estimate so the server can still check the limit.
  }
  if (!sizeBytes) sizeBytes = Math.ceil(result.width * result.height * 0.3);
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    sizeBytes,
    contentType: 'image/jpeg',
  };
}
