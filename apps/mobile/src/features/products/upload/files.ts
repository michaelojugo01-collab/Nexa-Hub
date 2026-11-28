import { Directory, File, Paths } from 'expo-file-system';

/**
 * Upload sources are copied into the app's document folder first: the picker's cache copy can
 * be cleared by the OS, and a resumed upload (even after a restart) must read the same bytes.
 */
export function keepForUpload(sourceUri: string, fileName: string): string {
  const dir = new Directory(Paths.document, 'uploads');
  if (!dir.exists) dir.create();
  const safeName = fileName.replace(/[^\w.-]+/g, '_').slice(-80);
  const target = new File(dir, `${Date.now().toString(36)}-${safeName}`);
  new File(sourceUri).copy(target);
  return target.uri;
}

export function removeUploadCopy(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists && uri.includes('/uploads/')) file.delete();
  } catch {
    // Already gone.
  }
}

/** One part of a file, read from disk only when it is sent. */
export function readPart(fileUri: string, offset: number, length: number): Uint8Array {
  const handle = new File(fileUri).open();
  try {
    handle.offset = offset;
    return handle.readBytesSync(length);
  } finally {
    handle.close();
  }
}
