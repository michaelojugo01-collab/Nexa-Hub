import { createApiClient, type ApiError, type OwnProduct } from '@nexa/api-contract';
import {
  createMockFetch,
  memoryPersistence,
  MockAuthServer,
  MockProductServer,
  MockStoreServer,
  MOCK_OTP_CODE,
  productTypes,
} from '@nexa/mocks';

import { memoryJobStore } from '@/features/products/upload/job-store';
import { createMultipartUploader, type UploadJob } from '@/features/products/upload/uploader';

const BASE = 'https://test.nexahub.ng';
const ADAEZE = '+2348031234567'; // seller with a store (adaezeprints)
const CHIDI = '+2348055550000'; // buyer

function setup(opts: { scanMs?: number; processMs?: number; rejectRate?: number } = {}) {
  let now = Date.parse('2026-11-28T10:00:00Z');
  const auth = new MockAuthServer({
    persistence: memoryPersistence(),
    accessTokenTtlSec: 3600,
    now: () => now,
  });
  const stores = new MockStoreServer({ auth, persistence: memoryPersistence(), now: () => now });
  const products = new MockProductServer({
    auth,
    stores,
    persistence: memoryPersistence(),
    now: () => now,
    scanMs: opts.scanMs ?? 0,
    processMs: opts.processMs ?? 0,
    rejectRate: () => opts.rejectRate ?? 0,
  });
  const fetch = createMockFetch({ server: auth, stores, products });
  const anon = createApiClient({ baseUrl: BASE, fetch });
  async function as(phone: string) {
    const { challengeId } = await anon.requestOtp({ phone, channel: 'sms' });
    const s = await anon.verifyOtp({ challengeId, code: MOCK_OTP_CODE, deviceId: 'd1' });
    return createApiClient({
      baseUrl: BASE,
      fetch,
      auth: {
        getAccessToken: () => s.accessToken,
        refresh: async () => null,
        onSessionEnded: () => {},
      },
    });
  }
  return { anon, as, products, advance: (ms: number) => (now += ms) };
}

const fail = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('Expected the request to fail');
    },
    (e: ApiError) => e,
  );

type Api = Awaited<ReturnType<ReturnType<typeof setup>['as']>>;

/** Uploads a file of `size` bytes through the real multipart uploader into the mock. */
async function uploadFile(
  api: Api,
  products: MockProductServer,
  productId: string,
  file: { kind: 'main' | 'cover' | 'preview'; name: string; type: string; size: number },
) {
  const uploader = createMultipartUploader({
    api: {
      start: (id, body) => api.startProductUpload(id, body),
      complete: (id, uploadId, parts) => api.completeProductUpload(id, uploadId, parts),
      abort: (id, uploadId) => api.abortProductUpload(id, uploadId),
    },
    transport: async ({ uploadId, partNumber, bytes }) => {
      const r = await products.receivePart(uploadId, partNumber, bytes.byteLength);
      if (r.status !== 200) throw { code: 'UPLOAD_FAILED', message: `status ${r.status}` };
      return r.etag;
    },
    store: memoryJobStore(),
    readPart: (_uri, offset, length) => new Uint8Array(Math.min(length, file.size - offset)),
    retryDelays: [],
  });
  const id = await uploader.start({
    productId,
    kind: file.kind,
    fileUri: `file:///docs/${file.name}`,
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });
  let job: UploadJob | undefined;
  for (let i = 0; i < 500; i++) {
    job = uploader.get(id);
    if (job?.status === 'done' || job?.status === 'failed') break;
    await new Promise((r) => setTimeout(r, 0));
  }
  if (job?.status !== 'done')
    throw new Error(`Upload ended ${job?.status}: ${job?.error?.message}`);
  return job.assetId!;
}

const sampleFor = (ext: string) => ({
  name: `content.${ext}`,
  type:
    ext === 'pdf'
      ? 'application/pdf'
      : ext === 'mp4'
        ? 'video/mp4'
        : ext === 'mp3'
          ? 'audio/mpeg'
          : 'application/octet-stream',
  size: 12 * 1024 * 1024 + 123, // 3 parts
});

describe('every product type can be created and published end to end', () => {
  it.each(productTypes.map((t) => [t.code, t.name]))('%s %s', async (code) => {
    const { as, products, anon } = setup();
    const api = await as(ADAEZE);
    const type = productTypes.find((t) => t.code === code)!;
    let p: OwnProduct = await api.createProduct({ typeCode: code, title: `Test ${type.name}` });
    expect(p).toMatchObject({ state: 'draft', contentMode: type.modes[0] });

    p = await api.updateProduct(p.id, {
      description: 'A test product.',
      price: { amountKobo: 150050, currency: 'NGN' },
      tags: ['test'],
      ...(type.modes[0] === 'LINK' ? { linkUrl: 'https://www.notion.so/test' } : {}),
    });
    if (type.modes[0] !== 'LINK') {
      const mainAssetId = await uploadFile(api, products, p.id, {
        kind: 'main',
        ...sampleFor(type.files!.extensions[0]!),
      });
      p = await api.updateProduct(p.id, { mainAssetId });
      expect(p.assets.find((a) => a.id === mainAssetId)?.status).toBe('ready');
    }
    const coverAssetId = await uploadFile(api, products, p.id, {
      kind: 'cover',
      name: 'cover.jpg',
      type: 'image/jpeg',
      size: 200_000,
    });
    p = await api.updateProduct(p.id, {
      coverAssetId,
      ...(type.rightsRequired ? { rightsDeclared: true } : {}),
    });

    const live = await api.publishProduct(p.id, 'public');
    expect(live).toMatchObject({ state: 'live', visibility: 'public' });
    const pub = await anon.getPublicProduct('adaezeprints', live.slug);
    expect(pub).toMatchObject({
      typeCode: code,
      typeName: type.name,
      price: { amountKobo: 150050 },
    });
    expect(JSON.stringify(pub)).not.toContain('notion.so/test');
  });
});

describe('publish rules', () => {
  async function draftOf(code: string) {
    const ctx = setup();
    const api = await ctx.as(ADAEZE);
    const p = await api.createProduct({ typeCode: code, title: 'Rules test' });
    await api.updateProduct(p.id, { price: { amountKobo: 50000, currency: 'NGN' } });
    return { ...ctx, api, id: p.id };
  }

  it('refuses until the file is ready, the cover is set and rights are declared', async () => {
    const { api, products, id } = await draftOf('A6'); // video lessons: rights required
    expect((await fail(api.publishProduct(id, 'public'))).code).toBe('ASSET_NOT_READY');
    const main = await uploadFile(api, products, id, {
      kind: 'main',
      name: 'lesson.mp4',
      type: 'video/mp4',
      size: 6_000_000,
    });
    await api.updateProduct(id, { mainAssetId: main });
    expect((await fail(api.publishProduct(id, 'public'))).code).toBe('COVER_REQUIRED');
    const cover = await uploadFile(api, products, id, {
      kind: 'cover',
      name: 'c.jpg',
      type: 'image/jpeg',
      size: 1000,
    });
    await api.updateProduct(id, { coverAssetId: cover });
    expect((await fail(api.publishProduct(id, 'public'))).code).toBe('RIGHTS_DECLARATION_REQUIRED');
    const declared = await api.updateProduct(id, { rightsDeclared: true });
    // The server records when, not the app.
    expect(declared.rightsDeclaredAt).toBe('2026-11-28T10:00:00.000Z');
    await expect(api.publishProduct(id, 'public')).resolves.toMatchObject({ state: 'live' });
  });

  it('waits for scanning and processing, and reports a failed virus scan', async () => {
    const ctx = setup({ scanMs: 4000, processMs: 6000 });
    const api = await ctx.as(ADAEZE);
    const p = await api.createProduct({ typeCode: 'A1', title: 'Scan test' });
    const main = await uploadFile(api, ctx.products, p.id, {
      kind: 'main',
      name: 'g.pdf',
      type: 'application/pdf',
      size: 3_000_000,
    });
    const asset = (s: OwnProduct) => s.assets.find((a) => a.id === main)!;
    let s = await api.updateProduct(p.id, { mainAssetId: main });
    expect(asset(s).status).toBe('scanning');
    ctx.advance(5000);
    s = await api.getOwnProduct(p.id);
    expect(asset(s).status).toBe('processing');
    ctx.advance(6000);
    s = await api.getOwnProduct(p.id);
    expect(asset(s)).toMatchObject({ status: 'ready', pageCount: 20 });

    const rejecting = setup({ rejectRate: 1 });
    const api2 = await rejecting.as(ADAEZE);
    const p2 = await api2.createProduct({ typeCode: 'A1', title: 'Rejected file' });
    await api2.updateProduct(p2.id, { price: { amountKobo: 50000, currency: 'NGN' } });
    const bad = await uploadFile(api2, rejecting.products, p2.id, {
      kind: 'main',
      name: 'x.pdf',
      type: 'application/pdf',
      size: 1000,
    });
    const s2 = await api2.updateProduct(p2.id, { mainAssetId: bad });
    expect(s2.assets.find((a) => a.id === bad)).toMatchObject({
      status: 'rejected',
      rejectionReason: 'The file failed the virus scan.',
    });
    expect((await fail(api2.publishProduct(p2.id, 'public'))).code).toBe('ASSET_NOT_READY');
  });

  it('checks field rules', async () => {
    const { api, id } = await draftOf('A1');
    expect((await fail(api.updateProduct(id, { title: 'x'.repeat(81) }))).code).toBe(
      'TITLE_TOO_LONG',
    );
    expect(
      (await fail(api.updateProduct(id, { price: { amountKobo: 9999, currency: 'NGN' } }))).code,
    ).toBe('PRICE_TOO_LOW');
    expect((await fail(api.updateProduct(id, { categorySlug: 'betting-tips' }))).code).toBe(
      'CATEGORY_NOT_ALLOWED',
    );
    expect((await fail(api.updateProduct(id, { description: 'x'.repeat(501) }))).status).toBe(400);
    expect((await fail(api.updateProduct(id, { contentMode: 'LINK' }))).code).toBe(
      'MODE_NOT_ALLOWED',
    );
    expect((await fail(api.updateProduct(id, { linkUrl: 'http://not-https.com' }))).code).toBe(
      'LINK_INVALID',
    );
    await expect(
      api.updateProduct(id, { price: { amountKobo: 10000, currency: 'NGN' } }),
    ).resolves.toMatchObject({ price: { amountKobo: 10000 } });
  });

  it('checks file type and size per type, and refuses ePub', async () => {
    const { api, id } = await draftOf('A1');
    const start = (name: string, type: string, size: number) =>
      fail(
        api.startProductUpload(id, {
          kind: 'main',
          fileName: name,
          contentType: type,
          sizeBytes: size,
        }),
      );
    expect((await start('book.epub', 'application/epub+zip', 1000)).code).toBe(
      'FILE_TYPE_NOT_ALLOWED',
    );
    expect((await start('song.mp3', 'audio/mpeg', 1000)).code).toBe('FILE_TYPE_NOT_ALLOWED');
    expect((await start('big.pdf', 'application/pdf', 200 * 1024 * 1024 + 1)).code).toBe(
      'FILE_TOO_LARGE',
    );
  });

  it('sends flagged listings to review instead of live', async () => {
    const { api, products, id } = await draftOf('A10');
    const main = await uploadFile(api, products, id, {
      kind: 'main',
      name: 'q.pdf',
      type: 'application/pdf',
      size: 1000,
    });
    const cover = await uploadFile(api, products, id, {
      kind: 'cover',
      name: 'c.jpg',
      type: 'image/jpeg',
      size: 1000,
    });
    await api.updateProduct(id, {
      mainAssetId: main,
      coverAssetId: cover,
      title: 'WAEC 2027 leaked answers',
    });
    await expect(api.publishProduct(id, 'public')).resolves.toMatchObject({
      state: 'pending_review',
    });
  });
});

describe('multipart uploads on the server', () => {
  it('lists the parts it has and signs only the rest on resume', async () => {
    const { as, products } = setup();
    const api = await as(ADAEZE);
    const p = await api.createProduct({ typeCode: 'A1' });
    const size = 11 * 1024 * 1024; // 3 parts
    const first = await api.startProductUpload(p.id, {
      kind: 'main',
      fileName: 'a.pdf',
      contentType: 'application/pdf',
      sizeBytes: size,
    });
    expect(first.parts.map((x) => x.partNumber)).toEqual([1, 2, 3]);
    await products.receivePart(first.uploadId, 1, first.partSize);
    const resumed = await api.startProductUpload(p.id, {
      kind: 'main',
      fileName: 'a.pdf',
      contentType: 'application/pdf',
      sizeBytes: size,
      uploadId: first.uploadId,
    });
    expect(resumed.completedParts).toEqual([{ partNumber: 1, etag: `"${first.uploadId}-1"` }]);
    expect(resumed.parts.map((x) => x.partNumber)).toEqual([2, 3]);
    // Completing with a part missing is refused.
    expect(
      (await fail(api.completeProductUpload(p.id, first.uploadId, resumed.completedParts))).status,
    ).toBe(400);
  });
});

describe('public responses never leak content', () => {
  it('has no link or file URL in any public product, list or sitemap', async () => {
    const { anon, as } = setup();
    const seller = await as(ADAEZE);
    const own = [
      ...(await seller.listMyProducts({ state: 'live', limit: 50 })).data,
      ...(await seller.listMyProducts({ state: 'draft', limit: 50 })).data,
      ...(await seller.listMyProducts({ state: 'unpublished', limit: 50 })).data,
    ];
    const secrets = own
      .flatMap((p) => [
        p.linkUrl,
        ...p.assets.filter((a) => a.kind === 'main').map((a) => a.fileName),
      ])
      .filter(Boolean) as string[];
    expect(secrets.length).toBeGreaterThan(0);

    const all = await anon.listProducts({ limit: 50 });
    const bodies: unknown[] = [all, await anon.listSitemap(), await anon.getDiscoverHome()];
    for (const summary of all.data)
      bodies.push(await anon.getPublicProduct(summary.store.slug, summary.slug));
    // Unlisted products open by link: check those too.
    bodies.push(
      await anon.getPublicProduct('adaezeprints', 'bridal-party-pattern-set-private-clients'),
    );
    const text = JSON.stringify(bodies);
    for (const secret of secrets) expect(text).not.toContain(secret);
    expect(text).not.toMatch(/mock:\/\/storage|notion\.so|canva\.com|linkUrl|"assets"/);
  });
});

describe('unlisted and unpublished', () => {
  it('never lists unlisted products, but opens them by link', async () => {
    const { anon } = setup();
    const lists = JSON.stringify([
      await anon.listProducts({ limit: 50 }),
      await anon.listProducts({ storeSlug: 'adaezeprints', limit: 50 }),
      await anon.listSitemap(),
      await anon.getDiscoverHome(),
    ]);
    expect(lists).not.toContain('bridal-party-pattern-set');
    await expect(
      anon.getPublicProduct('adaezeprints', 'bridal-party-pattern-set-private-clients'),
    ).resolves.toMatchObject({ visibility: 'unlisted' });
  });

  it('unpublishing removes a product from store, lists and sitemap, but keeps the record and buyers', async () => {
    const { anon, as, products } = setup();
    const seller = await as(ADAEZE);
    const slug = 'ankara-print-pattern-pack-40-designs';
    const before = await anon.listProducts({ storeSlug: 'adaezeprints', limit: 50 });
    const target = before.data.find((p) => p.slug === slug)!;
    const storeBefore = (await anon.getStore('adaezeprints')).productCount;

    await seller.unpublishProduct(target.id);
    const lists = JSON.stringify([
      await anon.listProducts({ limit: 50 }),
      await anon.listProducts({ storeSlug: 'adaezeprints', limit: 50 }),
      await anon.listSitemap(),
      await anon.getDiscoverHome(),
    ]);
    expect(lists).not.toContain(slug);
    expect((await anon.getStore('adaezeprints')).productCount).toBe(storeBefore - 1);
    expect((await fail(anon.getPublicProduct('adaezeprints', slug))).code).toBe(
      'PRODUCT_UNPUBLISHED',
    );
    // Never deleted.
    expect(await products.record(target.id)).toMatchObject({
      state: 'unpublished',
      title: target.title,
    });
    expect((await seller.listMyProducts({ state: 'unpublished' })).data.map((p) => p.id)).toContain(
      target.id,
    );

    await seller.republishProduct(target.id);
    await expect(anon.getPublicProduct('adaezeprints', slug)).resolves.toMatchObject({
      id: target.id,
    });
  });

  it('keeps the fixture buyer’s entitlement to an unpublished product', async () => {
    const { products, anon } = setup();
    const owned = products.entitlementsOf('usr_chidi').map((e) => e.productId);
    const record = await products.record('prd_034');
    expect(record).toMatchObject({ state: 'unpublished' });
    expect(owned).toContain('prd_034');
    expect((await fail(anon.getPublicProduct('adaezeprints', record!.slug))).status).toBe(410);
  });

  it('only sellers with a store can create products', async () => {
    const { as } = setup();
    const buyer = await as(CHIDI);
    expect((await fail(buyer.createProduct({ typeCode: 'A1' }))).code).toBe('NOT_SELLER');
  });
});

describe('fee preview', () => {
  it('is computed by the server (5% + ₦10)', async () => {
    const { as } = setup();
    const api = await as(ADAEZE);
    await expect(api.previewFee(150000)).resolves.toMatchObject({
      fee: { amountKobo: 8500 },
      youReceive: { amountKobo: 141500 },
      label: '5% + ₦10 per sale',
    });
  });
});
