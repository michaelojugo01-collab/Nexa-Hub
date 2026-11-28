import type { AssetKind, CompletedPart, MultipartUpload } from '@nexa/api-contract';

/**
 * ONE upload interface for product files. Screens only use `Uploader`; the multipart version
 * below talks to S3-style pre-signed part URLs. A tus version could replace it later without
 * changing any screen (docs/decisions.md, F4).
 */

export type UploadStatus =
  'uploading' | 'retrying' | 'paused' | 'failed' | 'completing' | 'done' | 'cancelled';

export type UploadJob = {
  id: string;
  productId: string;
  kind: AssetKind;
  fileUri: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: UploadStatus;
  /** Bytes the server has confirmed, plus progress of the part in flight. */
  sentBytes: number;
  uploadId: string | null;
  assetId: string | null;
  partSize: number;
  partCount: number;
  /** partNumber → ETag for every part storage confirmed. Persisted: resume starts after these. */
  etags: Record<number, string>;
  error: { code: string; message: string } | null;
  createdAt: number;
};

export type UploadInput = Pick<
  UploadJob,
  'productId' | 'kind' | 'fileUri' | 'fileName' | 'contentType' | 'sizeBytes'
>;

export interface Uploader {
  start(input: UploadInput): Promise<string>;
  pause(id: string): void;
  resume(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  get(id: string): UploadJob | undefined;
  all(): UploadJob[];
  subscribe(listener: (job: UploadJob) => void): () => void;
  /** Reload jobs saved before the app closed; unfinished ones carry on. */
  restore(): Promise<void>;
}

// ── Dependencies (real or mock) ─────────────────────────────────────────────

export type UploadApi = {
  start(
    productId: string,
    body: {
      kind: AssetKind;
      fileName: string;
      contentType: string;
      sizeBytes: number;
      uploadId?: string;
    },
  ): Promise<MultipartUpload>;
  complete(
    productId: string,
    uploadId: string,
    parts: CompletedPart[],
    fileUri: string,
  ): Promise<unknown>;
  abort(productId: string, uploadId: string): Promise<unknown>;
};

/** Sends one part to its pre-signed URL; resolves with the ETag. */
export type PartTransport = (part: {
  url: string;
  uploadId: string;
  partNumber: number;
  bytes: Uint8Array;
  onProgress: (sentInPart: number) => void;
  signal: AbortSignal;
}) => Promise<string>;

export type JobStore = {
  load(): Promise<UploadJob[]>;
  save(jobs: UploadJob[]): Promise<void>;
};

export type MultipartDeps = {
  api: UploadApi;
  transport: PartTransport;
  store: JobStore;
  readPart: (fileUri: string, offset: number, length: number) => Uint8Array;
  /** Waits between automatic retries of a failed part (ms). */
  retryDelays?: number[];
  now?: () => number;
  newId?: () => string;
};

class UploadError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const errorOf = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error && 'message' in error
    ? {
        code: String((error as { code: unknown }).code),
        message: String((error as { message: unknown }).message),
      }
    : {
        code: 'UPLOAD_FAILED',
        message: 'The upload stopped. Check your connection and try again.',
      };

const FINAL_CODES = ['FILE_TOO_LARGE', 'FILE_TYPE_NOT_ALLOWED', 'NOT_SELLER', 'NOT_FOUND'];

export function createMultipartUploader(deps: MultipartDeps): Uploader {
  const jobs = new Map<string, UploadJob>();
  const controllers = new Map<string, AbortController>();
  const listeners = new Set<(job: UploadJob) => void>();
  const delays = deps.retryDelays ?? [1000, 3000, 8000];
  const now = deps.now ?? (() => Date.now());
  const newId =
    deps.newId ?? (() => `job_${now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);

  const confirmedBytes = (job: UploadJob) =>
    Object.keys(job.etags).reduce((sum, n) => {
      const part = Number(n);
      return (
        sum +
        (part < job.partCount ? job.partSize : job.sizeBytes - job.partSize * (job.partCount - 1))
      );
    }, 0);

  async function persist() {
    await deps.store.save(
      [...jobs.values()].filter((j) => j.status !== 'cancelled' && j.status !== 'done'),
    );
  }

  function update(job: UploadJob, patch: Partial<UploadJob>, save = true) {
    Object.assign(job, patch);
    for (const listener of listeners) listener({ ...job });
    if (save) void persist();
  }

  const wait = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      if (ms <= 0) return resolve();
      const t = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new UploadError('ABORTED', 'Paused'));
      });
    });

  async function sendPart(job: UploadJob, url: string, partNumber: number, signal: AbortSignal) {
    const offset = (partNumber - 1) * job.partSize;
    const length = Math.min(job.partSize, job.sizeBytes - offset);
    const bytes = deps.readPart(job.fileUri, offset, length);
    const base = confirmedBytes(job);
    for (let attempt = 0; ; attempt++) {
      try {
        const etag = await deps.transport({
          url,
          uploadId: job.uploadId!,
          partNumber,
          bytes,
          signal,
          onProgress: (sent) => update(job, { sentBytes: base + sent }, false),
        });
        job.etags[partNumber] = etag;
        update(job, { sentBytes: confirmedBytes(job), status: 'uploading', error: null });
        return;
      } catch (error) {
        if (signal.aborted) throw new UploadError('ABORTED', 'Paused');
        const delay = delays[attempt];
        if (delay === undefined) throw error;
        update(job, { status: 'retrying', sentBytes: base, error: errorOf(error) }, false);
        await wait(delay, signal);
        update(job, { status: 'uploading' }, false);
      }
    }
  }

  async function run(job: UploadJob) {
    const controller = new AbortController();
    controllers.set(job.id, controller);
    update(job, { status: 'uploading', error: null });
    try {
      // Start, or resume: the server says which parts it already has and signs the rest.
      const session = await deps.api.start(job.productId, {
        kind: job.kind,
        fileName: job.fileName,
        contentType: job.contentType,
        sizeBytes: job.sizeBytes,
        uploadId: job.uploadId ?? undefined,
      });
      job.uploadId = session.uploadId;
      job.assetId = session.assetId;
      job.partSize = session.partSize;
      job.partCount = session.partCount;
      for (const part of session.completedParts) job.etags[part.partNumber] = part.etag;
      update(job, { sentBytes: confirmedBytes(job) });

      for (const part of session.parts) {
        if (controller.signal.aborted) throw new UploadError('ABORTED', 'Paused');
        if (job.etags[part.partNumber]) continue;
        await sendPart(job, part.url, part.partNumber, controller.signal);
      }

      update(job, { status: 'completing' });
      const parts = Object.entries(job.etags)
        .map(([n, etag]) => ({ partNumber: Number(n), etag }))
        .sort((a, b) => a.partNumber - b.partNumber);
      await deps.api.complete(job.productId, job.uploadId, parts, job.fileUri);
      update(job, { status: 'done', sentBytes: job.sizeBytes, error: null });
    } catch (error) {
      if (controller.signal.aborted) {
        if (job.status !== 'cancelled')
          update(job, { status: 'paused', sentBytes: confirmedBytes(job) });
        return;
      }
      const e = errorOf(error);
      update(job, {
        status: 'failed',
        sentBytes: confirmedBytes(job),
        error: e,
        // A refused file can't be resumed: drop the session so Retry starts clean.
        ...(FINAL_CODES.includes(e.code) ? { uploadId: null, etags: {} } : {}),
      });
    } finally {
      controllers.delete(job.id);
    }
  }

  return {
    async start(input) {
      const job: UploadJob = {
        ...input,
        id: newId(),
        status: 'uploading',
        sentBytes: 0,
        uploadId: null,
        assetId: null,
        partSize: 0,
        partCount: 0,
        etags: {},
        error: null,
        createdAt: now(),
      };
      jobs.set(job.id, job);
      void run(job);
      return job.id;
    },
    pause(id) {
      controllers.get(id)?.abort();
    },
    async resume(id) {
      const job = jobs.get(id);
      if (!job || controllers.has(id) || job.status === 'done' || job.status === 'cancelled')
        return;
      await run(job);
    },
    async cancel(id) {
      const job = jobs.get(id);
      if (!job) return;
      const wasRunning = controllers.get(id);
      job.status = 'cancelled';
      wasRunning?.abort();
      if (job.uploadId && job.status) {
        await deps.api.abort(job.productId, job.uploadId).catch(() => undefined);
      }
      update(job, { status: 'cancelled' });
      jobs.delete(id);
      await persist();
    },
    get: (id) => {
      const job = jobs.get(id);
      return job ? { ...job } : undefined;
    },
    all: () => [...jobs.values()].map((j) => ({ ...j })),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async restore() {
      for (const saved of await deps.store.load()) {
        if (jobs.has(saved.id)) continue;
        const job = { ...saved, sentBytes: 0 };
        job.sentBytes = confirmedBytes(job);
        jobs.set(job.id, job);
        // Interrupted mid-upload (app closed, phone off): carry on from the last part.
        if (['uploading', 'retrying', 'completing'].includes(saved.status)) void run(job);
        else for (const listener of listeners) listener({ ...job });
      }
    },
  };
}
