import * as ImagePicker from 'expo-image-picker';

/**
 * Opens the photo library (no permission prompt needed) with a square crop.
 * Returns the local URI, or null if the user cancelled. Upload comes in a later module.
 */
export async function pickAvatar(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
