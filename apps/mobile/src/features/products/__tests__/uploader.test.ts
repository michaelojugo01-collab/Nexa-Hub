import type { MultipartUpload } from '@nexa/api-contract';

import { memoryJobStore } from '../upload/job-store';
import { createMultipartUploader, type PartTransport, type UploadJob } from '../upload/uploader';

const PART = 10;
const SIZE = 45; // 5 parts: 10, 10, 10, 10, 5

/** A tiny fake storage + API: remembers parts like S3 does. */
function fakeBackend() {
  const stored = new Map<number, string>();
  let aborted = false;
  let completedWith: { partNumber: number; etag: string }[] | null = null;
  const session = (): MultipartUpload => ({
    uploadId: 'mpu_1',
    assetId: 'ast_1',
    partSize: PART,
    partCount: 5,
    completedParts: [...stored].map(([partNumber, etag]) => ({ partNumber, etag })),
    parts: [1, 2, 3, 4, 5]
      .filter((n) => !stored.has(n))
      .map((partNumber) => ({ partNumber, url: `https://s3.test/p/${partNumber}` })),
    expiresAt: '2026-12-01T00:00:00Z',
  });
  return {
    stored,
    sent: [] as number[],
    get aborted() {
      return aborted;
    },
    get completedWith() {
      return completedWith;
    },
    api: {
      start: jest.fn(async () => session()),
      complete: jest.fn(
        async (_p: string, _u: string, parts: { partNumber: number; etag: string }[]) => {
          completedWith = parts;
        },
      ),
      abort: jest.fn(async () => {
        aborted = true;
      }),
    },
  };
}

function setup(opts: { failParts?: number[]; failTimes?: number } = {}) {
  const backend = fakeBackend();
  const failures = new Map((opts.failParts ?? []).map((n) => [n, opts.failTimes ?? 1]));
  const transport: PartTransport = async ({ partNumber, bytes, onProgress }) => {
    backend.sent.push(partNumber);
    onProgress(Math.floor(bytes.byteLength / 2));
    const left = failures.get(partNumber) ?? 0;
    if (left > 0) {
      failures.set(partNumber, left - 1);
      throw { code: 'NETWORK_ERROR', message: 'The connection dropped.' };
    }
    const etag = `"e${partNumber}"`;
    backend.stored.set(partNumber, etag);
    return etag;
  };
  const store = memoryJobStore();
  const readPart = jest.fn(
    (_uri: string, offset: number, length: number) =>
      new Uint8Array(Math.max(0, Math.min(length, SIZE - offset))),
  );
  const make = () =>
    createMultipartUploader({
      api: backend.api,
      transport,
      store,
      readPart,
      retryDelays: [0, 0],
    });
  return { backend, store, readPart, make };
}

const input = {
  productId: 'prd_1',
  kind: 'main' as const,
  fileUri: 'file:///docs/uploads/guide.pdf',
  fileName: 'guide.pdf',
  contentType: 'application/pdf',
  sizeBytes: SIZE,
};

async function until(
  uploader: ReturnType<ReturnType<typeof setup>['make']>,
  id: string,
  status: UploadJob['status'],
) {
  for (let i = 0; i < 200; i++) {
    if (uploader.get(id)?.status === status) return uploader.get(id)!;
    await new Promise((r) => setTimeout(r, 0));
  }
  throw new Error(`Job never reached ${status}: ${uploader.get(id)?.status}`);
}

describe('multipart uploader', () => {
  it('uploads every part, reports progress and completes with all ETags', async () => {
    const { backend, make } = setup();
    const uploader = make();
    const progress: number[] = [];
    uploader.subscribe((job) => progress.push(job.sentBytes));
    const id = await uploader.start(input);
    const job = await until(uploader, id, 'done');

    expect(job.sentBytes).toBe(SIZE);
    expect(backend.sent).toEqual([1, 2, 3, 4, 5]);
    expect(backend.completedWith).toEqual(
      [1, 2, 3, 4, 5].map((n) => ({ partNumber: n, etag: `"e${n}"` })),
    );
    // Progress only moves forward, and includes the part in flight.
    expect(progress).toContain(5);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress);
  });

  it('retries a dropped part automatically', async () => {
    const { backend, make } = setup({ failParts: [3], failTimes: 2 });
    const uploader = make();
    const states: string[] = [];
    uploader.subscribe((job) => states.push(job.status));
    const id = await uploader.start(input);
    await until(uploader, id, 'done');
    expect(states).toContain('retrying');
    expect(backend.sent.filter((n) => n === 3)).toHaveLength(3);
  });

  it('fails after too many drops, then resumes from the last finished part', async () => {
    const { backend, make } = setup({ failParts: [4], failTimes: 3 });
    const uploader = make();
    const id = await uploader.start(input);
    const failed = await until(uploader, id, 'failed');
    expect(failed.error?.code).toBe('NETWORK_ERROR');
    expect(failed.sentBytes).toBe(30); // parts 1–3 confirmed
    expect(Object.keys(failed.etags)).toEqual(['1', '2', '3']);

    backend.sent.length = 0;
    await uploader.resume(id);
    await until(uploader, id, 'done');
    // Nothing before part 4 is sent again.
    expect(backend.sent).toEqual([4, 5]);
    expect(backend.api.start).toHaveBeenLastCalledWith(
      'prd_1',
      expect.objectContaining({ uploadId: 'mpu_1' }),
    );
  });

  it('resumes after the app restarts, without starting again', async () => {
    const { backend, store, make } = setup({ failParts: [3], failTimes: 3 });
    const first = make();
    const id = await first.start(input);
    await until(first, id, 'failed');
    // Simulate the app being killed mid-upload: the saved job still says "uploading".
    store.jobs = store.jobs.map((j) => ({ ...j, status: 'uploading' as const }));

    backend.sent.length = 0;
    const second = make(); // a fresh app start
    await second.restore();
    await until(second, id, 'done');
    expect(backend.sent).toEqual([3, 4, 5]);
    expect(store.jobs).toEqual([]); // finished jobs are not kept
  });

  it('pauses and resumes', async () => {
    const { backend, make } = setup();
    const uploader = make();
    const id = await uploader.start(input);
    uploader.pause(id);
    await until(uploader, id, 'paused');
    const sentBefore = backend.sent.length;
    expect(sentBefore).toBeLessThan(5);
    await uploader.resume(id);
    await until(uploader, id, 'done');
    expect(new Set(backend.sent).size).toBe(5);
  });

  it('cancels: aborts the upload on the server and forgets the job', async () => {
    const { backend, store, make } = setup({ failParts: [2], failTimes: 3 });
    const uploader = make();
    const id = await uploader.start(input);
    await until(uploader, id, 'failed');
    await uploader.cancel(id);
    expect(backend.aborted).toBe(true);
    expect(uploader.get(id)).toBeUndefined();
    expect(store.jobs).toEqual([]);
  });

  it('does not resume a refused file', async () => {
    const { backend, make } = setup();
    backend.api.start.mockRejectedValueOnce({
      code: 'FILE_TOO_LARGE',
      message: 'Ebooks can be up to 200 MB.',
    });
    const uploader = make();
    const id = await uploader.start(input);
    const failed = await until(uploader, id, 'failed');
    expect(failed.error).toEqual({
      code: 'FILE_TOO_LARGE',
      message: 'Ebooks can be up to 200 MB.',
    });
    expect(failed.uploadId).toBeNull();
  });
});
