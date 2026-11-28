import { ApiError, type UploadKind, type UploadTicket } from '@nexa/api-contract';
import { File } from 'expo-file-system';

import { api, mockStores } from '@/lib/api/client';
import { config } from '@/lib/config';
import { uploadLimits } from '@/lib/upload-limits';
import { useMockControl } from '@/mocks/mock-control';

import type { PreparedImage } from './prepare-image';

type UploadOptions = {
  kind: UploadKind;
  image: PreparedImage;
  /** 0–1 */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

const uploadFailed = () =>
  new ApiError(0, {
    code: 'UPLOAD_FAILED',
    message: 'The upload didn’t finish. Check your connection and try again.',
  });

const aborted = () => new ApiError(0, { code: 'UPLOAD_CANCELLED', message: 'Upload cancelled.' });

/**
 * 1. Ask the API for a pre-signed URL (it checks type and size).
 * 2. PUT the file straight to storage, never through the API server.
 * Returns the upload id to send with POST/PATCH /v1/stores.
 */
export async function uploadStoreImage({ kind, image, onProgress, signal }: UploadOptions) {
  const limit = uploadLimits[kind];
  if (image.sizeBytes > limit.maxBytes) {
    // Same answer the server gives; checked first so nobody waits for a refused upload.
    throw new ApiError(400, {
      code: 'FILE_TOO_LARGE',
      message: `${kind === 'avatar' ? 'Profile pictures' : 'Banners'} can be up to ${limit.label}.`,
    });
  }
  const ticket = await api.requestStoreUpload({
    kind,
    contentType: image.contentType,
    sizeBytes: image.sizeBytes,
  });
  if (signal?.aborted) throw aborted();
  await (mockStores ? simulatePut : put)(ticket, image, onProgress, signal);
  onProgress?.(1);
  return ticket.uploadId;
}

async function put(
  ticket: UploadTicket,
  image: PreparedImage,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
) {
  try {
    const result = await new File(image.uri).upload(ticket.uploadUrl, {
      httpMethod: ticket.method,
      headers: ticket.headers,
      onProgress: ({ bytesSent, totalBytes }) =>
        onProgress?.(totalBytes > 0 ? bytesSent / totalBytes : 0),
      signal,
    });
    if (result.status < 200 || result.status >= 300) throw uploadFailed();
  } catch (error) {
    if (signal?.aborted) throw aborted();
    throw error instanceof ApiError ? error : uploadFailed();
  }
}

/**
 * Mock mode: a slow upload with progress, and an occasional failure (or every time with the
 * Dev settings switch) so Retry can be seen. The mock storage then "receives" the file.
 */
async function simulatePut(
  ticket: UploadTicket,
  image: PreparedImage,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
) {
  const fails =
    useMockControl.getState().uploadsFail || Math.random() < config.mockUploadFailureRate;
  const durationMs = config.mockDelayMs * 3;
  const steps = durationMs > 0 ? 20 : 0;
  for (let i = 1; i <= steps; i++) {
    await new Promise((resolve) => setTimeout(resolve, durationMs / steps));
    if (signal?.aborted) throw aborted();
    if (fails && i === Math.round(steps * 0.6)) throw uploadFailed();
    onProgress?.(i / steps);
  }
  if (fails) throw uploadFailed();
  if (useMockControl.getState().offline) throw uploadFailed();
  const received = mockStores!.receiveUpload(ticket.uploadId, image.uri);
  if (received.status !== 200) throw uploadFailed();
}
