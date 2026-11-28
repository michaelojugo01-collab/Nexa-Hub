import { ApiError } from '@nexa/api-contract';

import { mockProducts } from '@/lib/api/client';
import { config } from '@/lib/config';
import { useMockControl } from '@/mocks/mock-control';

import type { PartTransport } from './uploader';

const dropped = () =>
  new ApiError(0, { code: 'NETWORK_ERROR', message: 'The connection dropped. Retrying…' });

/** Real storage: PUT the bytes to the pre-signed URL; S3 answers with the part's ETag. */
export const httpPartTransport: PartTransport = async ({ url, bytes, signal, onProgress }) => {
  let res: Response;
  try {
    res = await fetch(url, { method: 'PUT', body: bytes as unknown as BodyInit, signal });
  } catch {
    throw dropped();
  }
  if (!res.ok) {
    throw new ApiError(res.status, { code: 'UPLOAD_FAILED', message: 'Storage refused a part.' });
  }
  onProgress(bytes.byteLength);
  const etag = res.headers.get('ETag');
  if (!etag) throw new ApiError(0, { code: 'UPLOAD_FAILED', message: 'Storage sent no ETag.' });
  return etag;
};

/**
 * Mock storage: a slow part with progress ticks, sometimes a dropped connection (or always,
 * with the Dev settings switch or "offline"), then the mock backend records the part.
 */
export const mockPartTransport: PartTransport = async ({
  uploadId,
  partNumber,
  bytes,
  signal,
  onProgress,
}) => {
  const ticks = config.mockDelayMs > 0 ? 5 : 0;
  const control = useMockControl.getState();
  const drops =
    control.networkDrops || control.offline || Math.random() < config.mockNetworkDropRate;
  for (let i = 1; i <= ticks; i++) {
    await new Promise((r) => setTimeout(r, (config.mockDelayMs * 2) / ticks));
    if (signal.aborted) throw new ApiError(0, { code: 'ABORTED', message: 'Paused' });
    if (drops && i === 3) throw dropped();
    onProgress(Math.round((bytes.byteLength * i) / ticks));
  }
  if (drops) throw dropped();
  const result = await mockProducts!.receivePart(uploadId, partNumber, bytes.byteLength);
  if (result.status !== 200) {
    throw new ApiError(result.status, {
      code: 'UPLOAD_FAILED',
      message: 'Storage refused a part.',
    });
  }
  return result.etag;
};
