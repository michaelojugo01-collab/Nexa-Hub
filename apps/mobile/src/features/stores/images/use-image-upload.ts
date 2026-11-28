import type { UploadKind } from '@nexa/api-contract';
import { useEffect, useRef, useState } from 'react';

import { errorCode, errorMessage } from '@/lib/api/error-message';
import { logger } from '@/lib/logger';

import type { CropRect } from './crop-math';
import { prepareImage, type PreparedImage } from './prepare-image';
import { uploadStoreImage } from './upload-store-image';

export type ImageUploadState =
  | { status: 'empty' }
  | { status: 'preparing'; localUri: string }
  | { status: 'uploading'; localUri: string; progress: number }
  | { status: 'uploaded'; localUri: string; uploadId: string }
  | { status: 'failed'; localUri: string | null; message: string; canRetry: boolean };

/** Codes where trying the same file again cannot help. */
const FINAL_CODES = ['FILE_TOO_LARGE', 'FILE_TYPE_NOT_ALLOWED', 'NOT_SELLER'];

/**
 * One store image: prepare (crop, shrink, compress) → pre-signed upload with progress →
 * uploadId. Failed uploads keep the prepared file so Retry doesn't redo the work.
 */
export function useImageUpload(kind: UploadKind) {
  const [state, setState] = useState<ImageUploadState>({ status: 'empty' });
  const prepared = useRef<PreparedImage | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function upload(image: PreparedImage) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setState({ status: 'uploading', localUri: image.uri, progress: 0 });
    try {
      const uploadId = await uploadStoreImage({
        kind,
        image,
        signal: abort.signal,
        onProgress: (progress) =>
          !abort.signal.aborted && setState({ status: 'uploading', localUri: image.uri, progress }),
      });
      if (!abort.signal.aborted) setState({ status: 'uploaded', localUri: image.uri, uploadId });
    } catch (error) {
      if (abort.signal.aborted) return;
      const code = errorCode(error);
      setState({
        status: 'failed',
        localUri: image.uri,
        message: errorMessage(error),
        canRetry: !FINAL_CODES.includes(code ?? ''),
      });
    }
  }

  async function start(uri: string, crop: CropRect) {
    controller.current?.abort();
    setState({ status: 'preparing', localUri: uri });
    try {
      prepared.current = await prepareImage(uri, crop, kind);
    } catch (error) {
      logger.warn('Could not prepare image', error);
      setState({
        status: 'failed',
        localUri: null,
        message: 'We couldn’t open that image. Try another one.',
        canRetry: false,
      });
      return;
    }
    await upload(prepared.current);
  }

  function retry() {
    if (prepared.current) void upload(prepared.current);
  }

  function remove() {
    controller.current?.abort();
    prepared.current = null;
    setState({ status: 'empty' });
  }

  return { state, start, retry, remove };
}

/** Upload id when finished; undefined while there's nothing or it isn't done. */
export function uploadIdOf(state: ImageUploadState) {
  return state.status === 'uploaded' ? state.uploadId : undefined;
}

/** Local preview of a finished upload. */
export function uploadedUri(state: ImageUploadState) {
  return state.status === 'uploaded' ? state.localUri : null;
}

export function isUploadBusy(state: ImageUploadState) {
  return state.status === 'preparing' || state.status === 'uploading';
}
