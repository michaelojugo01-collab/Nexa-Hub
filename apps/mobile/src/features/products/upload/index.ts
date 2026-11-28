import { create } from 'zustand';

import { api, mockProducts } from '@/lib/api/client';
import { config } from '@/lib/config';

import { readPart } from './files';
import { fileJobStore } from './job-store';
import { httpPartTransport, mockPartTransport } from './transports';
import { createMultipartUploader, type UploadJob } from './uploader';

/** The app's one uploader (S3-style multipart today). */
export const uploader = createMultipartUploader({
  api: {
    start: (productId, body) => api.startProductUpload(productId, body),
    complete: async (productId, uploadId, parts, fileUri) => {
      const asset = await api.completeProductUpload(productId, uploadId, parts);
      // Mock mode: let previews and covers show the seller's own file.
      if (mockProducts) await mockProducts.attachLocalFile(productId, asset.id, fileUri);
      return asset;
    },
    abort: (productId, uploadId) => api.abortProductUpload(productId, uploadId),
  },
  transport: config.useMocks ? mockPartTransport : httpPartTransport,
  store: fileJobStore(),
  readPart,
  retryDelays: config.mockDelayMs === 0 && config.useMocks ? [0, 0, 0] : [1000, 3000, 8000],
});

/** Upload jobs for screens (kept in sync with the uploader's events). */
export const useUploadJobs = create<{ jobs: Record<string, UploadJob> }>(() => ({ jobs: {} }));

uploader.subscribe((job) =>
  useUploadJobs.setState((s) => {
    const jobs = { ...s.jobs };
    if (job.status === 'cancelled') delete jobs[job.id];
    else jobs[job.id] = job;
    return { jobs };
  }),
);

let restored: Promise<void> | null = null;
/** Call once at startup (and before showing uploads): resumes interrupted uploads. */
export function restoreUploads() {
  restored ??= uploader.restore();
  return restored;
}

export type { UploadJob, UploadStatus } from './uploader';
