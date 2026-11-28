import {
  isValidProductLink,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_MIN_PRICE_KOBO,
  PRODUCT_PREVIEW_PAGES_MAX,
  PRODUCT_TAGS_MAX,
  PRODUCT_TITLE_MAX,
  UPLOAD_PART_SIZE,
  type AssetStatus,
  type CompletedPart,
  type ContentMode,
  type DiscoverHome,
  type FeePreview,
  type MultipartUpload,
  type OwnProduct,
  type Product,
  type ProductAsset,
  type ProductCreate,
  type ProductState,
  type ProductSummary,
  type ProductTypeDef,
  type ProductUpdate,
  type ProductVisibility,
  type SitemapEntry,
  type UploadStart,
} from '@nexa/api-contract';

import type { MockAuthServer, MockResult } from '../auth/server';
import {
  categories,
  findProductType,
  isListed,
  productRecordsFresh,
  productTypes,
  prohibitedCategories,
  slugify,
  tagFixtures,
  entitlementFixtures,
  type AssetRecord,
  type ProductRecord,
} from '../fixtures';
import { mockLog as logger } from '../log';
import type { MockPersistence } from '../persistence';
import type { MockStoreServer } from '../stores/server';
import { MOCK_UPLOAD_ORIGIN } from '../stores/server';

/**
 * Fake products backend (F4), following the spec's rules: one Product model with a content
 * mode; draft → live (or pending_review when flagged) ⇄ unpublished, never deleted; title 80,
 * description 500, minimum price ₦100, category allowlist; per-type file rules; multipart
 * uploads that resume from the parts storage already has; scanning → processing → ready (or
 * rejected); publish only when the content is ready, the cover is set and rights are declared.
 * Public responses never contain the LINK URL or any file URL.
 */

const err = (status: number, code: string, message: string): MockResult<never> => ({
  status,
  body: { code, message },
});
const ok = <T>(body: T, status = 200): MockResult<T> => ({ status, body });
const notFound = () => err(404, 'NOT_FOUND', 'We couldn’t find that product.');

const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const COVER_MAX_BYTES = 10 * 1024 * 1024;
const PREVIEW_RULES = {
  video_clip: { types: ['video/mp4', 'video/quicktime'], maxBytes: 200 * 1024 * 1024 },
  audio_clip: { types: ['audio/mpeg', 'audio/wav', 'audio/x-wav'], maxBytes: 50 * 1024 * 1024 },
} as const;
/** Listing words that send a product to review (academic dishonesty, Ways To Earn Part 4). */
const FLAGGED = /\bleak(ed|s)?\b|\bexpo\b|answers? to (the )?(jamb|waec|neco)|\bcheat(ing)?\b/i;

type UploadSession = {
  uploadId: string;
  productId: string;
  assetId: string;
  kind: AssetRecord['kind'];
  fileName: string;
  contentType: string;
  sizeBytes: number;
  partSize: number;
  partCount: number;
  /** partNumber → etag, as "storage" received them. */
  parts: Record<number, string>;
  expiresAt: number;
};

type Db = {
  products: Record<string, ProductRecord>;
  uploads: Record<string, UploadSession>;
  /** asset id → decided outcome after processing */
  outcomes: Record<string, 'ready' | 'rejected'>;
  seq: number;
};

export type MockProductServerOptions = {
  auth: MockAuthServer;
  stores: MockStoreServer;
  persistence: MockPersistence;
  now?: () => number;
  /** How long a finished upload stays in each stage (0 in tests). */
  scanMs?: number;
  processMs?: number;
  /** Share of uploads rejected by the "virus scan" (read on each completion). */
  rejectRate?: () => number;
  random?: () => number;
};

function freshDb(): Db {
  return {
    products: Object.fromEntries(productRecordsFresh().map((p) => [p.id, p])),
    uploads: {},
    outcomes: {},
    seq: 1,
  };
}

const extOf = (fileName: string) => fileName.toLowerCase().split('.').pop() ?? '';

export class MockProductServer {
  private db: Db = freshDb();
  private loaded: Promise<void> | null = null;
  private readonly now: () => number;
  private readonly random: () => number;

  constructor(private readonly options: MockProductServerOptions) {
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? Math.random;
    options.auth.onReset(() => this.reset());
    options.stores.setProductCounter(
      (slug) =>
        Object.values(this.db.products).filter((p) => p.storeSlug === slug && isListed(p)).length,
    );
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  private ensureLoaded() {
    this.loaded ??= this.options.persistence
      .load()
      .then((json) => {
        if (!json) return;
        const saved = JSON.parse(json) as Partial<Db>;
        const fresh = freshDb();
        this.db = {
          products: { ...fresh.products, ...saved.products },
          uploads: saved.uploads ?? {},
          outcomes: saved.outcomes ?? {},
          seq: saved.seq ?? 1,
        };
      })
      .catch(() => {
        this.db = freshDb();
      });
    return this.loaded;
  }

  private async persist() {
    const fixtures = freshDb().products;
    const products = Object.fromEntries(
      Object.entries(this.db.products).filter(
        ([id, p]) => JSON.stringify(p) !== JSON.stringify(fixtures[id]),
      ),
    );
    await this.options.persistence
      .save(
        JSON.stringify({
          products,
          uploads: this.db.uploads,
          outcomes: this.db.outcomes,
          seq: this.db.seq,
        }),
      )
      .catch(() => logger.warn('Mock products could not be saved'));
  }

  async reset() {
    this.db = freshDb();
    this.loaded = Promise.resolve();
    await this.options.persistence.clear();
  }

  private id(prefix: string) {
    return `${prefix}_${(this.db.seq++).toString(36)}${this.random().toString(36).slice(2, 8)}`;
  }

  private iso(ms = this.now()) {
    return new Date(ms).toISOString();
  }

  // ── Derived views ─────────────────────────────────────────────────────────

  /** Asset status from time since upload finished: scanning → processing → ready/rejected. */
  private assetStatus(asset: AssetRecord): AssetStatus {
    if (asset.status) return asset.status;
    if (!asset.completedAt) return 'uploading';
    if (asset.kind === 'cover') return 'ready';
    const elapsed = this.now() - Date.parse(asset.completedAt);
    const scan = this.options.scanMs ?? 0;
    const proc = this.options.processMs ?? 0;
    const outcome = this.db.outcomes[asset.id] ?? 'ready';
    if (elapsed < scan) return 'scanning';
    if (outcome === 'rejected') return 'rejected';
    if (elapsed < scan + proc) return 'processing';
    return 'ready';
  }

  private assetView(asset: AssetRecord): ProductAsset {
    const status = this.assetStatus(asset);
    const ready = status === 'ready';
    const isPdf = asset.contentType === 'application/pdf';
    const isMedia = /^(video|audio)\//.test(asset.contentType);
    return {
      id: asset.id,
      kind: asset.kind,
      status,
      rejectionReason:
        status === 'rejected' ? (asset.rejectionReason ?? 'The file failed the virus scan.') : null,
      fileName: asset.fileName,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      pageCount:
        asset.pageCount ??
        (ready && isPdf ? Math.max(1, Math.round(asset.sizeBytes / 150_000)) : null),
      durationSeconds:
        asset.durationSeconds ??
        (ready && isMedia
          ? Math.max(
              1,
              Math.round(
                asset.sizeBytes / (asset.contentType.startsWith('video') ? 600_000 : 24_000),
              ),
            )
          : null),
      createdAt: asset.createdAt,
    };
  }

  private assetOf(product: ProductRecord, id: string | null) {
    return id ? product.assets.find((a) => a.id === id) : undefined;
  }

  private preview(product: ProductRecord, type: ProductTypeDef) {
    const main = this.assetOf(product, product.mainAssetId);
    const mainReady = main ? this.assetStatus(main) === 'ready' : false;
    const pages =
      type.preview === 'pages' && product.contentMode !== 'LINK' && mainReady
        ? Array.from(
            { length: Math.min(product.previewPages, PRODUCT_PREVIEW_PAGES_MAX) },
            (_, i) => `https://picsum.photos/seed/nexa-prv-${product.id}-${i + 1}/600/800`,
          )
        : [];
    const clipAsset = this.assetOf(product, product.previewAssetId);
    const clipUrl =
      clipAsset && this.assetStatus(clipAsset) === 'ready'
        ? clipAsset.storageUri
        : product.previewClipUrl;
    const clipKind: 'video' | 'audio' | null =
      type.preview === 'video_clip' ? 'video' : type.preview === 'audio_clip' ? 'audio' : null;
    return { pages, clipUrl: clipKind ? clipUrl : null, clipKind: clipUrl ? clipKind : null };
  }

  /** Store names live in the stores mock (they can change, and new stores exist). */
  private storeNames = new Map<string, string>();

  private async refreshStoreNames() {
    for (const s of await this.options.stores.allStoreRecords())
      this.storeNames.set(s.slug, s.name);
  }

  private summary(product: ProductRecord): ProductSummary {
    const name = this.storeNames.get(product.storeSlug) ?? product.storeSlug;
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      typeCode: product.typeCode,
      typeName: findProductType(product.typeCode)?.name ?? product.typeCode,
      contentMode: product.contentMode,
      price: product.price ?? { amountKobo: 0, currency: 'NGN' },
      compareAtPrice: product.compareAtPrice,
      imageUrl: product.coverUrl,
      store: { slug: product.storeSlug, name },
      featured: product.featured,
    };
  }

  private ownView(product: ProductRecord): OwnProduct {
    const type = findProductType(product.typeCode)!;
    return {
      id: product.id,
      slug: product.slug,
      typeCode: product.typeCode,
      typeName: type.name,
      contentMode: product.contentMode,
      state: product.state,
      visibility: product.visibility,
      title: product.title,
      description: product.description,
      categorySlug: product.categorySlug,
      tags: product.tags,
      price: product.price,
      coverUrl: product.coverUrl,
      linkUrl: product.linkUrl,
      previewPages: product.previewPages,
      assets: product.assets.map((a) => this.assetView(a)),
      mainAssetId: product.mainAssetId,
      coverAssetId: product.coverAssetId,
      previewAssetId: product.previewAssetId,
      preview: this.preview(product, type),
      rightsDeclaredAt: product.rightsDeclaredAt,
      salesCount: product.salesCount,
      store: {
        slug: product.storeSlug,
        name: this.storeNames.get(product.storeSlug) ?? product.storeSlug,
      },
      publishedAt: product.publishedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  // ── Access ────────────────────────────────────────────────────────────────

  private async seller(authorization: string | undefined) {
    await this.ensureLoaded();
    await this.refreshStoreNames();
    const { user, error } = await this.options.auth.resolveUser(authorization);
    if (error) return { error };
    if (!user.roles.includes('seller')) {
      return { error: err(403, 'NOT_SELLER', 'Start selling first to add products.') };
    }
    const store = await this.options.stores.findStoreRecordByOwner(user.id);
    if (!store) return { error: err(409, 'STORE_REQUIRED', 'Set up your store first.') };
    return { user, store };
  }

  private async own(authorization: string | undefined, id: string) {
    const ctx = await this.seller(authorization);
    if (ctx.error) return { error: ctx.error };
    const product = this.db.products[id];
    if (!product || product.storeSlug !== ctx.store.slug) return { error: notFound() };
    return { ...ctx, product };
  }

  // ── Catalogue data ────────────────────────────────────────────────────────

  listTypes() {
    return ok({ data: productTypes, nextCursor: null });
  }

  listTags(q: string, limit: number) {
    const needle = q.trim().toLowerCase();
    const data = tagFixtures
      .filter((t) => !needle || t.slug.includes(needle) || t.name.includes(needle))
      .slice(0, Math.min(20, Math.max(1, limit || 10)));
    return ok({ data, nextCursor: null });
  }

  /** The fee is the server's business (5% + ₦10); the app only shows the result. */
  feePreview(priceKobo: number): MockResult<FeePreview> {
    if (!Number.isSafeInteger(priceKobo) || priceKobo < 0) {
      return err(400, 'VALIDATION_ERROR', 'priceKobo must be a whole number of kobo.');
    }
    const fee = priceKobo === 0 ? 0 : Math.round((priceKobo * 5) / 100) + 1000;
    const money = (amountKobo: number) => ({ amountKobo, currency: 'NGN' as const });
    return ok({
      price: money(priceKobo),
      fee: money(fee),
      youReceive: money(Math.max(0, priceKobo - fee)),
      label: '5% + ₦10 per sale',
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private categoryError(slug: string | undefined | null) {
    if (slug === undefined || slug === null) return null;
    if (
      prohibitedCategories.some((c) => c.slug === slug) ||
      !categories.some((c) => c.slug === slug)
    ) {
      return err(400, 'CATEGORY_NOT_ALLOWED', 'That category isn’t allowed on Nexa Hub.');
    }
    return null;
  }

  private uniqueSlug(storeSlug: string, title: string, selfId: string) {
    const base = slugify(title || 'product');
    let slug = base;
    for (
      let i = 2;
      Object.values(this.db.products).some(
        (p) => p.storeSlug === storeSlug && p.slug === slug && p.id !== selfId,
      );
      i++
    ) {
      slug = `${base.slice(0, 56)}-${i}`;
    }
    return slug;
  }

  /** What still stops publishing, as the error to send (null when ready). */
  private publishBlocker(product: ProductRecord) {
    const type = findProductType(product.typeCode)!;
    if (!product.title.trim()) return err(409, 'VALIDATION_ERROR', 'Add a title.');
    if (!product.categorySlug) return err(409, 'VALIDATION_ERROR', 'Choose a category.');
    if (!product.price || product.price.amountKobo < PRODUCT_MIN_PRICE_KOBO) {
      return err(409, 'PRICE_TOO_LOW', 'The minimum price is ₦100.');
    }
    if (product.contentMode === 'LINK') {
      if (!product.linkUrl || !isValidProductLink(product.linkUrl)) {
        return err(409, 'LINK_INVALID', 'Add the link buyers get after paying.');
      }
    } else {
      const main = this.assetOf(product, product.mainAssetId);
      const status = main ? this.assetStatus(main) : null;
      if (status !== 'ready') {
        return err(
          409,
          'ASSET_NOT_READY',
          status === 'rejected'
            ? 'Your file was rejected. Upload a different file.'
            : main
              ? 'Your file is still being checked. Try again in a moment.'
              : 'Upload the file buyers get.',
        );
      }
    }
    if (!product.coverUrl) return err(409, 'COVER_REQUIRED', 'Add a cover image.');
    if (type.rightsRequired && !product.rightsDeclaredAt) {
      return err(409, 'RIGHTS_DECLARATION_REQUIRED', 'Confirm you own the rights to this content.');
    }
    return null;
  }

  // ── Seller endpoints ──────────────────────────────────────────────────────

  async listMine(
    authorization: string | undefined,
    state: string | undefined,
    paginate: (all: OwnProduct[]) => MockResult<unknown>,
  ) {
    const ctx = await this.seller(authorization);
    if (ctx.error) return ctx.error;
    const wanted: ProductState[] =
      state === 'draft'
        ? ['draft']
        : state === 'unpublished'
          ? ['unpublished']
          : ['live', 'pending_review'];
    const mine = Object.values(this.db.products)
      .filter((p) => p.storeSlug === ctx.store.slug && wanted.includes(p.state))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((p) => this.ownView(p));
    return paginate(mine);
  }

  async create(authorization: string | undefined, body: ProductCreate) {
    const ctx = await this.seller(authorization);
    if (ctx.error) return ctx.error;
    const type = findProductType(body?.typeCode ?? '');
    if (!type) return err(400, 'VALIDATION_ERROR', 'Choose a product type.');
    const mode = body.contentMode ?? type.modes[0]!;
    if (!type.modes.includes(mode)) {
      return err(400, 'MODE_NOT_ALLOWED', 'This product type can’t be delivered that way.');
    }
    const title = (body.title ?? '').trim();
    if (title.length > PRODUCT_TITLE_MAX) {
      return err(400, 'TITLE_TOO_LONG', 'Titles can be up to 80 characters.');
    }
    const now = this.iso();
    const id = this.id('prd');
    const product: ProductRecord = {
      id,
      slug: this.uniqueSlug(ctx.store.slug, title || type.name, id),
      storeSlug: ctx.store.slug,
      typeCode: type.code,
      contentMode: mode,
      state: 'draft',
      visibility: 'public',
      title,
      description: '',
      categorySlug: type.defaultCategorySlug,
      tags: [],
      price: null,
      compareAtPrice: null,
      featured: false,
      coverUrl: null,
      coverAssetId: null,
      mainAssetId: null,
      previewAssetId: null,
      previousMainAssetId: null,
      linkUrl: null,
      previewPages: type.preview === 'pages' ? 3 : 0,
      previewClipUrl: null,
      rightsDeclaredAt: null,
      salesCount: 0,
      assets: [],
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.db.products[id] = product;
    await this.persist();
    return ok(this.ownView(product), 201);
  }

  async get(authorization: string | undefined, id: string) {
    const ctx = await this.own(authorization, id);
    if (ctx.error) return ctx.error;
    return ok(this.ownView(ctx.product));
  }

  async update(authorization: string | undefined, id: string, body: ProductUpdate) {
    const ctx = await this.own(authorization, id);
    if (ctx.error) return ctx.error;
    const { product } = ctx;
    const type = findProductType(product.typeCode)!;
    if (!body || Object.keys(body).length === 0) {
      return err(400, 'VALIDATION_ERROR', 'Nothing to update.');
    }
    if (body.title !== undefined && body.title.trim().length > PRODUCT_TITLE_MAX) {
      return err(400, 'TITLE_TOO_LONG', 'Titles can be up to 80 characters.');
    }
    if (
      body.description !== undefined &&
      body.description.trim().length > PRODUCT_DESCRIPTION_MAX
    ) {
      return err(400, 'VALIDATION_ERROR', 'Descriptions can be up to 500 characters.');
    }
    if (body.price !== undefined) {
      if (!Number.isSafeInteger(body.price.amountKobo) || body.price.currency !== 'NGN') {
        return err(400, 'VALIDATION_ERROR', 'Prices are whole kobo in NGN.');
      }
      if (body.price.amountKobo < PRODUCT_MIN_PRICE_KOBO) {
        return err(400, 'PRICE_TOO_LOW', 'The minimum price is ₦100.');
      }
    }
    const categoryError = this.categoryError(body.categorySlug);
    if (categoryError) return categoryError;
    if (
      body.tags !== undefined &&
      (body.tags.length > PRODUCT_TAGS_MAX || body.tags.some((t) => !t.trim() || t.length > 30))
    ) {
      return err(400, 'VALIDATION_ERROR', 'Use up to 5 tags of 30 characters or fewer.');
    }
    if (body.contentMode !== undefined && body.contentMode !== product.contentMode) {
      if (!type.modes.includes(body.contentMode)) {
        return err(400, 'MODE_NOT_ALLOWED', 'This product type can’t be delivered that way.');
      }
      if (product.state !== 'draft') {
        return err(400, 'MODE_NOT_ALLOWED', 'You can’t change how buyers get a published product.');
      }
    }
    if (body.linkUrl && !isValidProductLink(body.linkUrl)) {
      return err(400, 'LINK_INVALID', 'Enter a full https:// link.');
    }
    if (
      body.previewPages !== undefined &&
      (!Number.isInteger(body.previewPages) ||
        body.previewPages < 0 ||
        body.previewPages > PRODUCT_PREVIEW_PAGES_MAX)
    ) {
      return err(400, 'VALIDATION_ERROR', 'Show 0 to 5 preview pages.');
    }
    if (
      body.visibility !== undefined &&
      body.visibility !== 'public' &&
      body.visibility !== 'unlisted'
    ) {
      return err(400, 'VALIDATION_ERROR', 'Visibility is public or unlisted.');
    }
    const asset = (assetId: string | null | undefined, kind: AssetRecord['kind']) =>
      assetId ? product.assets.find((a) => a.id === assetId && a.kind === kind) : undefined;
    if (body.coverAssetId !== undefined) {
      const cover = asset(body.coverAssetId, 'cover');
      if (!cover || this.assetStatus(cover) !== 'ready') {
        return err(400, 'ASSET_NOT_READY', 'That cover hasn’t finished uploading.');
      }
    }
    if (body.mainAssetId !== undefined && !asset(body.mainAssetId, 'main')) {
      return err(400, 'VALIDATION_ERROR', 'That file upload was not found.');
    }
    if (body.previewAssetId && !asset(body.previewAssetId, 'preview')) {
      return err(400, 'VALIDATION_ERROR', 'That preview upload was not found.');
    }

    if (body.title !== undefined) {
      product.title = body.title.trim();
      if (product.state === 'draft') {
        product.slug = this.uniqueSlug(product.storeSlug, product.title || type.name, product.id);
      }
    }
    if (body.description !== undefined) product.description = body.description.trim();
    if (body.categorySlug !== undefined) product.categorySlug = body.categorySlug;
    if (body.tags !== undefined)
      product.tags = [...new Set(body.tags.map((t) => t.trim().toLowerCase()))];
    if (body.price !== undefined)
      product.price = { amountKobo: body.price.amountKobo, currency: 'NGN' };
    if (body.contentMode !== undefined) product.contentMode = body.contentMode;
    if (body.linkUrl !== undefined) product.linkUrl = body.linkUrl?.trim() || null;
    if (body.previewPages !== undefined) product.previewPages = body.previewPages;
    if (body.coverAssetId !== undefined) {
      product.coverAssetId = body.coverAssetId;
      product.coverUrl = asset(body.coverAssetId, 'cover')!.storageUri;
    }
    if (body.mainAssetId !== undefined && body.mainAssetId !== product.mainAssetId) {
      // Live products: past buyers get the new file; the old one is kept 30 days.
      if (product.state !== 'draft') product.previousMainAssetId = product.mainAssetId;
      product.mainAssetId = body.mainAssetId;
    }
    if (body.previewAssetId !== undefined) product.previewAssetId = body.previewAssetId;
    if (body.visibility !== undefined) product.visibility = body.visibility;
    if (body.rightsDeclared !== undefined) {
      // The server records when; the app only sends the tick.
      product.rightsDeclaredAt = body.rightsDeclared
        ? (product.rightsDeclaredAt ?? this.iso())
        : null;
    }
    product.updatedAt = this.iso();
    await this.persist();
    return ok(this.ownView(product));
  }

  async publish(authorization: string | undefined, id: string, visibility: ProductVisibility) {
    const ctx = await this.own(authorization, id);
    if (ctx.error) return ctx.error;
    const { product } = ctx;
    if (product.state !== 'draft') {
      return err(409, 'VALIDATION_ERROR', 'Only drafts can be published.');
    }
    if (visibility !== 'public' && visibility !== 'unlisted') {
      return err(400, 'VALIDATION_ERROR', 'Visibility is public or unlisted.');
    }
    const blocker = this.publishBlocker(product);
    if (blocker) return blocker;
    product.visibility = visibility;
    product.state = FLAGGED.test(`${product.title} ${product.description}`)
      ? 'pending_review'
      : 'live';
    product.publishedAt = this.iso();
    product.updatedAt = product.publishedAt;
    await this.persist();
    return ok(this.ownView(product));
  }

  async unpublish(authorization: string | undefined, id: string) {
    const ctx = await this.own(authorization, id);
    if (ctx.error) return ctx.error;
    const { product } = ctx;
    if (product.state !== 'live' && product.state !== 'pending_review') {
      return err(409, 'VALIDATION_ERROR', 'Only live products can be unpublished.');
    }
    product.state = 'unpublished';
    product.updatedAt = this.iso();
    await this.persist();
    return ok(this.ownView(product));
  }

  async republish(authorization: string | undefined, id: string) {
    const ctx = await this.own(authorization, id);
    if (ctx.error) return ctx.error;
    const { product } = ctx;
    if (product.state !== 'unpublished') {
      return err(409, 'VALIDATION_ERROR', 'Only unpublished products can be republished.');
    }
    const blocker = this.publishBlocker(product);
    if (blocker) return blocker;
    product.state = FLAGGED.test(`${product.title} ${product.description}`)
      ? 'pending_review'
      : 'live';
    product.updatedAt = this.iso();
    await this.persist();
    return ok(this.ownView(product));
  }

  /** Mock admin: approve listings in review (one, or all of them). Dev settings / tests. */
  async approveReview(id?: string) {
    await this.ensureLoaded();
    for (const product of Object.values(this.db.products)) {
      if (product.state === 'pending_review' && (!id || product.id === id)) product.state = 'live';
    }
    await this.persist();
  }

  // ── Multipart uploads ─────────────────────────────────────────────────────

  private uploadView(session: UploadSession): MultipartUpload {
    const remaining = Array.from({ length: session.partCount }, (_, i) => i + 1).filter(
      (n) => !session.parts[n],
    );
    return {
      uploadId: session.uploadId,
      assetId: session.assetId,
      partSize: session.partSize,
      partCount: session.partCount,
      completedParts: Object.entries(session.parts).map(([n, etag]) => ({
        partNumber: Number(n),
        etag,
      })),
      parts: remaining.map((partNumber) => ({
        partNumber,
        url: `${MOCK_UPLOAD_ORIGIN}/parts/${session.uploadId}/${partNumber}?expires=${session.expiresAt}`,
      })),
      expiresAt: this.iso(session.expiresAt),
    };
  }

  private fileRuleError(type: ProductTypeDef, mode: ContentMode, body: UploadStart) {
    const ext = extOf(body.fileName);
    if (body.kind === 'main') {
      if (mode === 'LINK' || !type.files) {
        return err(
          400,
          'FILE_TYPE_NOT_ALLOWED',
          'This product is a link: there’s no file to upload.',
        );
      }
      if (ext === 'epub') {
        return err(400, 'FILE_TYPE_NOT_ALLOWED', 'ePub isn’t supported yet. Upload a PDF.');
      }
      if (!type.files.extensions.includes(ext)) {
        return err(400, 'FILE_TYPE_NOT_ALLOWED', `Upload ${type.files.label.split(', up to')[0]}.`);
      }
      if (body.sizeBytes > type.files.maxBytes) {
        return err(
          400,
          'FILE_TOO_LARGE',
          `${type.name}: files can be up to ${type.files.label.split('up to ')[1]}.`,
        );
      }
      return null;
    }
    if (body.kind === 'cover') {
      if (!COVER_TYPES.includes(body.contentType)) {
        return err(400, 'FILE_TYPE_NOT_ALLOWED', 'Use a JPEG, PNG or WebP image.');
      }
      if (body.sizeBytes > COVER_MAX_BYTES) {
        return err(400, 'FILE_TOO_LARGE', 'Covers can be up to 10 MB.');
      }
      return null;
    }
    const rules =
      type.preview === 'video_clip' || type.preview === 'audio_clip'
        ? PREVIEW_RULES[type.preview]
        : null;
    if (!rules || !rules.types.includes(body.contentType as never)) {
      return err(400, 'FILE_TYPE_NOT_ALLOWED', 'That preview type isn’t allowed for this product.');
    }
    if (body.sizeBytes > rules.maxBytes) {
      return err(400, 'FILE_TOO_LARGE', 'Previews are short clips: up to 1 minute.');
    }
    return null;
  }

  async startUpload(authorization: string | undefined, id: string, body: UploadStart) {
    const ctx = await this.own(authorization, id);
    if (ctx.error) return ctx.error;
    const { product } = ctx;

    if (body?.uploadId) {
      const session = this.db.uploads[body.uploadId];
      if (!session || session.productId !== product.id) return notFound();
      session.expiresAt = this.now() + 24 * 3_600_000; // fresh URLs for the missing parts
      await this.persist();
      return ok(this.uploadView(session), 201);
    }
    if (
      !body ||
      !body.kind ||
      !body.fileName ||
      !Number.isSafeInteger(body.sizeBytes) ||
      body.sizeBytes < 1
    ) {
      return err(
        400,
        'VALIDATION_ERROR',
        'kind, fileName, contentType and sizeBytes are required.',
      );
    }
    const type = findProductType(product.typeCode)!;
    const ruleError = this.fileRuleError(type, product.contentMode, body);
    if (ruleError) return ruleError;

    const assetId = this.id('ast');
    const partSize = UPLOAD_PART_SIZE;
    const session: UploadSession = {
      uploadId: this.id('mpu'),
      productId: product.id,
      assetId,
      kind: body.kind,
      fileName: body.fileName,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      partSize,
      partCount: Math.max(1, Math.ceil(body.sizeBytes / partSize)),
      parts: {},
      expiresAt: this.now() + 24 * 3_600_000,
    };
    this.db.uploads[session.uploadId] = session;
    product.assets.push({
      id: assetId,
      kind: body.kind,
      fileName: body.fileName,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      createdAt: this.iso(),
      completedAt: null,
      status: null,
      rejectionReason: null,
      pageCount: null,
      durationSeconds: null,
      storageUri: `mock://storage/${product.id}/${assetId}/${body.fileName}`,
    });
    await this.persist();
    return ok(this.uploadView(session), 201);
  }

  /**
   * Mock storage receiving one part (the app PUTs straight to the pre-signed URL; this stands
   * in for S3). Returns the ETag, or an HTTP status like storage would.
   */
  async receivePart(uploadId: string, partNumber: number, byteLength: number) {
    await this.ensureLoaded();
    const session = this.db.uploads[uploadId];
    if (!session) return { status: 404 as const };
    if (this.now() > session.expiresAt) return { status: 403 as const };
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > session.partCount) {
      return { status: 400 as const };
    }
    const expected =
      partNumber < session.partCount
        ? session.partSize
        : session.sizeBytes - session.partSize * (session.partCount - 1);
    if (byteLength !== expected) return { status: 400 as const };
    const etag = `"${uploadId}-${partNumber}"`;
    session.parts[partNumber] = etag;
    await this.persist();
    return { status: 200 as const, etag };
  }

  async completeUpload(
    authorization: string | undefined,
    id: string,
    uploadId: string,
    parts: CompletedPart[] | undefined,
  ) {
    const ctx = await this.own(authorization, id);
    if (ctx.error) return ctx.error;
    const session = this.db.uploads[uploadId];
    if (!session || session.productId !== id) return notFound();
    const sent = new Map((parts ?? []).map((p) => [p.partNumber, p.etag]));
    for (let n = 1; n <= session.partCount; n++) {
      if (!session.parts[n] || sent.get(n) !== session.parts[n]) {
        return err(400, 'VALIDATION_ERROR', `Part ${n} is missing or doesn’t match.`);
      }
    }
    const asset = ctx.product.assets.find((a) => a.id === session.assetId)!;
    asset.completedAt = this.iso();
    if (asset.kind !== 'cover') {
      const rejectRate = this.options.rejectRate?.() ?? 0;
      this.db.outcomes[asset.id] = this.random() < rejectRate ? 'rejected' : 'ready';
    }
    delete this.db.uploads[uploadId];
    ctx.product.updatedAt = this.iso();
    await this.persist();
    return ok(this.assetView(asset));
  }

  /**
   * Mock-only: point an asset at the app's local copy of the file, so the seller sees their
   * own cover and preview clip (a real CDN would serve processed copies).
   */
  async attachLocalFile(productId: string, assetId: string, fileUri: string) {
    await this.ensureLoaded();
    const product = this.db.products[productId];
    const asset = product?.assets.find((a) => a.id === assetId);
    if (!product || !asset) return;
    asset.storageUri = fileUri;
    if (product.coverAssetId === assetId) product.coverUrl = fileUri;
    await this.persist();
  }

  async abortUpload(authorization: string | undefined, id: string, uploadId: string) {
    const ctx = await this.own(authorization, id);
    if (ctx.error) return ctx.error;
    const session = this.db.uploads[uploadId];
    if (!session || session.productId !== id) return notFound();
    delete this.db.uploads[uploadId];
    ctx.product.assets = ctx.product.assets.filter((a) => a.id !== session.assetId);
    await this.persist();
    return { status: 204, body: null } as MockResult;
  }

  // ── Public reads ──────────────────────────────────────────────────────────

  /** Live, public products of public stores (optionally one store), newest first. */
  async listed(storeSlug?: string, includePrivateStore = false) {
    await this.ensureLoaded();
    await this.refreshStoreNames();
    const publicStores = new Set(
      (await this.options.stores.allStoreRecords())
        .filter((s) => s.visibility === 'public')
        .map((s) => s.slug),
    );
    return Object.values(this.db.products)
      .filter(
        (p) =>
          p.state === 'live' &&
          p.visibility === 'public' &&
          (publicStores.has(p.storeSlug) || includePrivateStore) &&
          (!storeSlug || p.storeSlug === storeSlug),
      )
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .map((p) => this.summary(p));
  }

  /**
   * GET /v1/stores/{storeSlug}/products/{productSlug}. Live (public or unlisted) products of
   * public stores. Unpublished → 410. Never includes the link or file URLs.
   */
  async getPublic(storeSlug: string, productSlug: string) {
    await this.ensureLoaded();
    await this.refreshStoreNames();
    const store = await this.options.stores.findStoreRecord(storeSlug);
    if (!store || store.visibility !== 'public') return notFound();
    const product = Object.values(this.db.products).find(
      (p) => p.storeSlug === store.slug && p.slug === productSlug,
    );
    if (!product || product.state === 'draft' || product.state === 'pending_review') {
      return notFound();
    }
    if (product.state === 'unpublished') {
      return err(410, 'PRODUCT_UNPUBLISHED', 'This product is no longer available.');
    }
    const type = findProductType(product.typeCode)!;
    const main = this.assetOf(product, product.mainAssetId);
    const mainView = main ? this.assetView(main) : null;
    const category = categories.find((c) => c.slug === product.categorySlug) ?? null;
    const summary = this.summary(product);
    const body: Product = {
      ...summary,
      store: { slug: store.slug, name: store.name },
      description: product.description || null,
      images: product.coverUrl ? [product.coverUrl] : [],
      storeInfo: this.options.stores.storeSummary(store),
      publishedAt: product.publishedAt ?? product.createdAt,
      redirectTo: storeSlug !== store.slug ? store.slug : null,
      visibility: product.visibility,
      category,
      tags: product.tags.map((slug) => ({ slug, name: slug.replace(/-/g, ' ') })),
      preview: this.preview(product, type),
      content: {
        pageCount: mainView?.pageCount ?? null,
        durationSeconds: mainView?.durationSeconds ?? null,
        fileSizeBytes:
          product.contentMode === 'DOWNLOAD_LIMITED' ? (mainView?.sizeBytes ?? null) : null,
        fileLabel:
          product.contentMode === 'DOWNLOAD_LIMITED' && main
            ? extOf(main.fileName).toUpperCase()
            : null,
      },
    };
    return ok(body);
  }

  /** GET /v1/sitemap: public stores, then listed products. Never unlisted, drafts or unpublished. */
  async sitemapEntries(): Promise<SitemapEntry[]> {
    const publicStores = (await this.options.stores.allStoreRecords()).filter(
      (s) => s.visibility === 'public',
    );
    const storeEntries = publicStores.map<SitemapEntry>((s) => ({
      type: 'store',
      path: `/${s.slug}`,
      updatedAt: s.createdAt,
    }));
    const listed = new Set((await this.listed()).map((p) => p.id));
    const productEntries = Object.values(this.db.products)
      .filter((p) => listed.has(p.id))
      .map<SitemapEntry>((p) => ({
        type: 'product',
        path: `/${p.storeSlug}/${p.slug}`,
        updatedAt: p.updatedAt,
      }));
    return [...storeEntries, ...productEntries];
  }

  /** Discover home built from what is listed right now. */
  async discoverHome(): Promise<DiscoverHome> {
    const listed = await this.listed();
    const storeRecords = await this.options.stores.allStoreRecords();
    return {
      featuredStores: storeRecords
        .filter((s) => s.verified && s.visibility === 'public')
        .map((s) => this.options.stores.storeSummary(s)),
      trendingProducts: [...listed]
        .sort((a, b) => Number(b.featured) - Number(a.featured))
        .slice(0, 8),
      newProducts: listed.slice(0, 10),
    };
  }

  /** For tests and F5: the raw record (never deleted) and who owns it. */
  async record(id: string) {
    await this.ensureLoaded();
    return this.db.products[id];
  }

  entitlementsOf(userId: string) {
    return entitlementFixtures.filter((e) => e.userId === userId);
  }
}
