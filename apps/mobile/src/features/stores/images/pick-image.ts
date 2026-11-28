import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; width: number; height: number };

export type PickResult =
  { status: 'picked'; image: PickedImage } | { status: 'cancelled' } | { status: 'unsupported' };

/**
 * Opens the photo library (no permission prompt on iOS 14+ / Android 13+). No built-in crop:
 * our own crop screen gives the same 1:1 and 3:1 frames on iOS and Android.
 * Any still image the phone can decode is fine (HEIC included): it is re-encoded as JPEG.
 */
export async function pickImage(): Promise<PickResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled) return { status: 'cancelled' };
  const asset = result.assets[0];
  if (!asset) return { status: 'cancelled' };
  if (asset.mimeType === 'image/gif' || asset.type === 'video') return { status: 'unsupported' };
  return { status: 'picked', image: { uri: asset.uri, width: asset.width, height: asset.height } };
}
