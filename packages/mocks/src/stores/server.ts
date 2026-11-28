import type {
  FollowState,
  Product,
  PublicProfile,
  SitemapEntry,
  ImageVariants,
  OwnStore,
  SlugAvailability,
  Store,
  StoreCreate,
  StoreUpdate,
  UploadRequest,
  UploadTicket,
} from '@nexa/api-contract';

import {
  isAllowedImageType,
  isValidSlug,
  STORE_BIO_MAX,
  STORE_NAME_MAX,
  STORE_NAME_MIN,
  uploadLimits,
} from '@nexa/api-contract';

import type { MockAuthServer, MockResult } from '../auth/server';
import { mockLog as logger } from '../log';
import type { MockPersistence } from '../persistence';
import {
  categories,
  fixtureFollows,
  productRecords,
  profileFixtures,
  reservedSlugs,
  storeRecords,
  toPublicStore,
  toSummary,
  type StoreRecord,
} from '../fixtures';

/**
 * Fake stores backend (F2), following the spec's rules: one store per seller, slug format +
 * reserved names, one slug change that leaves a redirect, 150-character bios, private stores,
 * follows, and pre-signed uploads with type/size limits and three resized variants.
 */

const err = (status: number, code: string, message: string): MockResult<never> => ({
  status,
  body: { code, message },
});
const ok = <T>(body: T, status = 200): MockResult<T> => ({ status, body });

const notFound = () => err(404, 'NOT_FOUND', 'We couldn’t find that store.');
const noStore = () => err(404, 'NOT_FOUND', 'You don’t have a store yet.');

type Upload = UploadRequest & {
  userId: string;
  expiresAt: number;
  /** Set when the file "arrives" at the storage URL. */
  fileUri: string | null;
};

type Db = {
  /** Every store, keyed by id (fixtures plus the ones sellers create). */
  stores: Record<string, StoreRecord>;
  /** user id → ids of the stores they follow */
  follows: Record<string, string[]>;
  seq: number;
};

export type MockStoreServerOptions = {
  auth: MockAuthServer;
  persistence: MockPersistence;
  now?: () => number;
};

function freshDb(): Db {
  return {
    stores: Object.fromEntries(storeRecords().map((r) => [r.id, r])),
    follows: JSON.parse(JSON.stringify(fixtureFollows)) as Db['follows'],
    seq: 1,
  };
}

function followersOf(follows: Db['follows'], storeId: string) {
  return Object.values(follows).filter((ids) => ids.includes(storeId)).length;
}

export class MockStoreServer {
  private db: Db = freshDb();
  private uploads = new Map<string, Upload>();
  private loaded: Promise<void> | null = null;
  private readonly auth: MockAuthServer;
  private readonly now: () => number;

  constructor(private readonly options: MockStoreServerOptions) {
    this.auth = options.auth;
    this.now = options.now ?? (() => Date.now());
    this.auth.onReset(() => this.reset());
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
          stores: { ...fresh.stores, ...saved.stores },
          follows: saved.follows ?? fresh.follows,
          seq: saved.seq ?? 1,
        };
      })
      .catch(() => {
        this.db = freshDb();
      });
    return this.loaded;
  }

  private async persist() {
    // Only what differs from the fixtures, to keep the stored value small.
    const fixtures = freshDb().stores;
    const stores = Object.fromEntries(
      Object.entries(this.db.stores).filter(
        ([id, s]) => JSON.stringify(s) !== JSON.stringify(fixtures[id]),
      ),
    );
    await this.options.persistence
      .save(JSON.stringify({ stores, follows: this.db.follows, seq: this.db.seq }))
      .catch(() => logger.warn('Mock stores could not be saved'));
  }

  async reset() {
    this.db = freshDb();
    this.uploads.clear();
    this.loaded = Promise.resolve();
    await this.options.persistence.clear();
  }

  private id(prefix: string) {
    return `${prefix}_${(this.db.seq++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  private followerCount(record: StoreRecord) {
    // Fixture counts already include the fixture follows; add the difference.
    const base = followersOf(fixtureFollows, record.id);
    return Math.max(0, record.followerCount + followersOf(this.db.follows, record.id) - base);
  }

  private view(record: StoreRecord, viewerId: string | null, requestedSlug?: string): Store {
    return {
      ...toPublicStore(record),
      followerCount: this.followerCount(record),
      isFollowing: !!viewerId && (this.db.follows[viewerId] ?? []).includes(record.id),
      isOwner: viewerId === record.ownerId,
      redirectTo: requestedSlug && requestedSlug !== record.slug ? record.slug : null,
    };
  }

  private ownView(record: StoreRecord): OwnStore {
    return {
      ...this.view(record, record.ownerId),
      slugChangesRemaining: record.slugChangesRemaining,
      previousSlug: record.previousSlug,
    };
  }

  private bySlug(slug: string) {
    const all = Object.values(this.db.stores);
    return all.find((s) => s.slug === slug) ?? all.find((s) => s.previousSlug === slug);
  }

  private byOwner(userId: string) {
    return Object.values(this.db.stores).find((s) => s.ownerId === userId);
  }

  /** Signed-in viewer for public endpoints: anonymous is fine, an expired token is a 401. */
  private async optionalViewer(authorization: string | undefined) {
    if (!authorization) return { viewerId: null };
    const { user, error } = await this.auth.resolveUser(authorization);
    if (error) return { error };
    return { viewerId: user.id };
  }

  private async seller(authorization: string | undefined) {
    const { user, error } = await this.auth.resolveUser(authorization);
    if (error) return { error };
    if (!user.roles.includes('seller')) {
      return { error: err(403, 'NOT_SELLER', 'Start selling first to create a store.') };
    }
    return { user };
  }

  // ── Slugs ─────────────────────────────────────────────────────────────────

  private slugStatus(slug: string, ownStoreId?: string): SlugAvailability['reason'] {
    if (!isValidSlug(slug)) return 'invalid';
    if (reservedSlugs.includes(slug)) return 'reserved';
    const owner = this.bySlug(slug);
    if (owner && owner.id !== ownStoreId) return 'taken';
    // Your own old slug is held for the redirect; you can't move back to it.
    if (owner && owner.slug !== slug) return 'taken';
    return null;
  }

  private slugError(reason: NonNullable<SlugAvailability['reason']>) {
    if (reason === 'invalid')
      return err(400, 'SLUG_INVALID', 'Use 3–30 lowercase letters, numbers or hyphens.');
    if (reason === 'reserved')
      return err(400, 'SLUG_RESERVED', 'That link is reserved. Try another.');
    return err(409, 'SLUG_TAKEN', 'That link is already taken. Try another.');
  }

  async checkSlug(authorization: string | undefined, slug: string) {
    await this.ensureLoaded();
    const { user, error } = await this.auth.resolveUser(authorization);
    if (error) return error;
    const reason = this.slugStatus(slug, this.byOwner(user.id)?.id);
    return ok<SlugAvailability>({ slug, available: reason === null, reason });
  }

  // ── Field validation shared by create and update ──────────────────────────

  private validateFields(body: Partial<StoreCreate>) {
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (name.length < STORE_NAME_MIN || name.length > STORE_NAME_MAX) {
        return err(400, 'VALIDATION_ERROR', 'Store names are 2–40 characters.');
      }
    }
    if (body.bio && body.bio.trim().length > STORE_BIO_MAX) {
      return err(400, 'VALIDATION_ERROR', 'Your bio can be up to 150 characters.');
    }
    if (body.categorySlug !== undefined && !categories.some((c) => c.slug === body.categorySlug)) {
      return err(400, 'VALIDATION_ERROR', 'Choose a category from the list.');
    }
    if (body.visibility !== undefined && !['public', 'private'].includes(body.visibility)) {
      return err(400, 'VALIDATION_ERROR', 'Visibility is public or private.');
    }
    return null;
  }

  /** Turns a finished upload into the "processed" image: three variants from the CDN. */
  private takeUpload(
    uploadId: string | null | undefined,
    kind: UploadRequest['kind'],
    userId: string,
  ): { images?: ImageVariants | null; error?: MockResult<never> } {
    if (uploadId === undefined) return {};
    if (uploadId === null) return { images: null };
    const upload = this.uploads.get(uploadId);
    if (!upload || upload.userId !== userId || upload.kind !== kind) {
      return { error: err(400, 'VALIDATION_ERROR', 'That image upload was not found.') };
    }
    if (!upload.fileUri) {
      return { error: err(400, 'VALIDATION_ERROR', 'That image hasn’t finished uploading.') };
    }
    this.uploads.delete(uploadId);
    // Mock processing: a real server resizes into three sizes. Here every variant points at
    // the seller's own (already compressed) file so they see their image.
    return { images: { small: upload.fileUri, medium: upload.fileUri, large: upload.fileUri } };
  }

  // ── Stores ────────────────────────────────────────────────────────────────

  async getStore(authorization: string | undefined, slug: string) {
    await this.ensureLoaded();
    const viewer = await this.optionalViewer(authorization);
    if (viewer.error) return viewer.error;
    const record = this.bySlug(slug);
    if (!record) return notFound();
    if (record.visibility === 'private' && record.ownerId !== viewer.viewerId) {
      return err(403, 'STORE_PRIVATE', 'This store is private.');
    }
    return ok(this.view(record, viewer.viewerId, slug));
  }

  async getMyStore(authorization: string | undefined) {
    await this.ensureLoaded();
    const { user, error } = await this.auth.resolveUser(authorization);
    if (error) return error;
    const record = this.byOwner(user.id);
    return record ? ok(this.ownView(record)) : noStore();
  }

  async createStore(authorization: string | undefined, body: StoreCreate) {
    await this.ensureLoaded();
    const { user, error } = await this.seller(authorization);
    if (error) return error;
    if (this.byOwner(user.id)) return err(409, 'STORE_EXISTS', 'You already have a store.');
    if (!body.name || !body.slug || !body.categorySlug) {
      return err(400, 'VALIDATION_ERROR', 'Name, link and category are required.');
    }
    const invalid = this.validateFields(body);
    if (invalid) return invalid;
    const reason = this.slugStatus(body.slug);
    if (reason) return this.slugError(reason);
    const avatar = this.takeUpload(body.avatarUploadId, 'avatar', user.id);
    if (avatar.error) return avatar.error;
    const banner = this.takeUpload(body.bannerUploadId, 'banner', user.id);
    if (banner.error) return banner.error;

    const record: StoreRecord = {
      id: this.id('str'),
      slug: body.slug,
      name: body.name.trim(),
      avatarUrl: avatar.images?.medium ?? null,
      location: null,
      verified: false,
      followerCount: 0,
      bio: body.bio?.trim() || null,
      coverUrl: banner.images?.large ?? null,
      productCount: 0,
      createdAt: new Date(this.now()).toISOString(),
      category: categories.find((c) => c.slug === body.categorySlug) ?? null,
      avatar: avatar.images ?? null,
      banner: banner.images ?? null,
      visibility: body.visibility ?? 'public',
      ownerId: user.id,
      previousSlug: null,
      slugChangesRemaining: 1,
    };
    this.db.stores[record.id] = record;
    user.store = toSummary(record);
    await Promise.all([this.persist(), this.auth.saveUsers()]);
    return ok(this.ownView(record), 201);
  }

  async updateStore(authorization: string | undefined, body: StoreUpdate) {
    await this.ensureLoaded();
    const { user, error } = await this.seller(authorization);
    if (error) return error;
    const record = this.byOwner(user.id);
    if (!record) return noStore();
    if (!body || Object.keys(body).length === 0) {
      return err(400, 'VALIDATION_ERROR', 'Nothing to update.');
    }
    const invalid = this.validateFields(body);
    if (invalid) return invalid;

    const slugChanges = body.slug !== undefined && body.slug !== record.slug;
    if (slugChanges) {
      if (record.slugChangesRemaining < 1) {
        return err(409, 'SLUG_CHANGE_USED', 'You’ve already changed your store link once.');
      }
      const reason = this.slugStatus(body.slug!, record.id);
      if (reason) return this.slugError(reason);
    }
    const avatar = this.takeUpload(body.avatarUploadId, 'avatar', user.id);
    if (avatar.error) return avatar.error;
    const banner = this.takeUpload(body.bannerUploadId, 'banner', user.id);
    if (banner.error) return banner.error;

    if (slugChanges) {
      record.previousSlug = record.slug;
      record.slug = body.slug!;
      record.slugChangesRemaining -= 1;
    }
    if (body.name !== undefined) record.name = body.name.trim();
    if (body.bio !== undefined) record.bio = body.bio?.trim() || null;
    if (body.categorySlug !== undefined) {
      record.category = categories.find((c) => c.slug === body.categorySlug) ?? null;
    }
    if (body.visibility !== undefined) record.visibility = body.visibility;
    if (avatar.images !== undefined) {
      record.avatar = avatar.images;
      record.avatarUrl = avatar.images?.medium ?? null;
    }
    if (banner.images !== undefined) {
      record.banner = banner.images;
      record.coverUrl = banner.images?.large ?? null;
    }
    user.store = toSummary({ ...record, followerCount: this.followerCount(record) });
    await Promise.all([this.persist(), this.auth.saveUsers()]);
    return ok(this.ownView(record));
  }

  // ── Follows ───────────────────────────────────────────────────────────────

  private async setFollow(authorization: string | undefined, storeId: string, follow: boolean) {
    await this.ensureLoaded();
    const { user, error } = await this.auth.resolveUser(authorization);
    if (error) return error;
    const record = this.db.stores[storeId];
    if (!record || (record.visibility === 'private' && record.ownerId !== user.id)) {
      return notFound();
    }
    if (follow && record.ownerId === user.id) {
      return err(409, 'CANNOT_FOLLOW_OWN_STORE', 'You can’t follow your own store.');
    }
    const current = this.db.follows[user.id] ?? [];
    const next = follow
      ? [...new Set([...current, storeId])]
      : current.filter((id) => id !== storeId);
    if (next.length !== current.length) {
      this.db.follows[user.id] = next;
      await this.persist();
    }
    return ok<FollowState>({
      storeId,
      following: follow,
      followerCount: this.followerCount(record),
    });
  }

  follow(authorization: string | undefined, storeId: string) {
    return this.setFollow(authorization, storeId, true);
  }

  unfollow(authorization: string | undefined, storeId: string) {
    return this.setFollow(authorization, storeId, false);
  }

  // ── Products (store filter) ───────────────────────────────────────────────

  /**
   * For GET /v1/products?storeSlug=: the store's current slug, or the error to send.
   * Private stores' products are hidden from everyone but the owner.
   */
  async productStore(authorization: string | undefined, slug: string) {
    await this.ensureLoaded();
    const viewer = await this.optionalViewer(authorization);
    if (viewer.error) return { error: viewer.error };
    const record = this.bySlug(slug);
    if (!record) return { error: notFound() };
    if (record.visibility === 'private' && record.ownerId !== viewer.viewerId) {
      return { error: err(403, 'STORE_PRIVATE', 'This store is private.') };
    }
    return { slug: record.slug };
  }

  /** Slugs of stores everyone can see right now (for public product lists). */
  async publicStoreSlugs() {
    await this.ensureLoaded();
    return new Set(
      Object.values(this.db.stores)
        .filter((s) => s.visibility === 'public')
        .map((s) => s.slug),
    );
  }

  // ── Public web (F3) ───────────────────────────────────────────────────────

  /** GET /v1/stores/{storeSlug}/products/{productSlug}: live products of public stores. */
  async getPublicProduct(storeSlug: string, productSlug: string) {
    await this.ensureLoaded();
    const notFoundProduct = err(404, 'NOT_FOUND', 'We couldn’t find that product.');
    const store = this.bySlug(storeSlug);
    if (!store || store.visibility !== 'public') return notFoundProduct;
    const record = productRecords.find(
      (p) => p.store.slug === store.slug && p.slug === productSlug && p.status === 'live',
    );
    if (!record) return notFoundProduct;
    const { status: _s, updatedAt: _u, ...product } = record;
    return ok<Product>({
      ...product,
      store: { slug: store.slug, name: store.name },
      storeInfo: toSummary({ ...store, followerCount: this.followerCount(store) }),
      redirectTo: storeSlug !== store.slug ? store.slug : null,
    });
  }

  /** GET /v1/users/{username}: public fields only; the store only if it is public. */
  async getPublicProfile(username: string) {
    await this.ensureLoaded();
    const account = await this.auth.findUserByUsername(username);
    const seed = account ? undefined : profileFixtures.find((p) => p.username === username);
    const person = account ?? seed;
    if (!person || !person.username) {
      return err(404, 'NOT_FOUND', 'We couldn’t find that profile.');
    }
    const store = this.byOwner(person.id);
    return ok<PublicProfile>({
      username: person.username,
      displayName: person.displayName,
      avatarUrl: person.avatarUrl,
      bio: person.bio,
      store:
        store && store.visibility === 'public'
          ? toSummary({ ...store, followerCount: this.followerCount(store) })
          : null,
      createdAt: person.createdAt,
    });
  }

  /** GET /v1/sitemap: public stores, then live products of public stores. */
  async sitemapEntries(): Promise<SitemapEntry[]> {
    await this.ensureLoaded();
    const publicStores = Object.values(this.db.stores).filter((s) => s.visibility === 'public');
    const slugs = new Set(publicStores.map((s) => s.slug));
    const storeEntries = publicStores.map<SitemapEntry>((s) => ({
      type: 'store',
      path: `/${s.slug}`,
      updatedAt: s.createdAt,
    }));
    const currentSlug = (slug: string) => this.bySlug(slug)?.slug ?? slug;
    const productEntries = productRecords
      .filter((p) => p.status === 'live' && slugs.has(currentSlug(p.store.slug)))
      .map<SitemapEntry>((p) => ({
        type: 'product',
        path: `/${currentSlug(p.store.slug)}/${p.slug}`,
        updatedAt: p.updatedAt,
      }));
    return [...storeEntries, ...productEntries];
  }

  // ── Uploads ───────────────────────────────────────────────────────────────

  async requestUpload(authorization: string | undefined, body: UploadRequest) {
    await this.ensureLoaded();
    const { user, error } = await this.seller(authorization);
    if (error) return error;
    const limits = body?.kind ? uploadLimits[body.kind] : undefined;
    if (!limits) return err(400, 'VALIDATION_ERROR', 'kind is avatar or banner.');
    if (!isAllowedImageType(body.contentType)) {
      return err(400, 'FILE_TYPE_NOT_ALLOWED', 'Use a JPEG, PNG or WebP image.');
    }
    if (!Number.isInteger(body.sizeBytes) || body.sizeBytes < 1) {
      return err(400, 'VALIDATION_ERROR', 'sizeBytes must be a positive whole number.');
    }
    if (body.sizeBytes > limits.maxBytes) {
      const what = body.kind === 'avatar' ? 'Profile pictures' : 'Banners';
      return err(400, 'FILE_TOO_LARGE', `${what} can be up to ${limits.label}.`);
    }
    const uploadId = this.id('upl');
    const expiresAt = this.now() + 15 * 60_000;
    this.uploads.set(uploadId, { ...body, userId: user.id, expiresAt, fileUri: null });
    return ok<UploadTicket>(
      {
        uploadId,
        uploadUrl: `${MOCK_UPLOAD_ORIGIN}/store-${body.kind}s/${uploadId}?signature=mock`,
        method: 'PUT',
        headers: { 'Content-Type': body.contentType },
        expiresAt: new Date(expiresAt).toISOString(),
        maxBytes: limits.maxBytes,
      },
      201,
    );
  }

  /**
   * Called by the mock uploader when its simulated PUT to `uploadUrl` finishes. A real
   * storage bucket would receive the bytes; the API server never sees them.
   */
  receiveUpload(uploadId: string, fileUri: string): { status: number } {
    const upload = this.uploads.get(uploadId);
    if (!upload) return { status: 404 };
    if (this.now() > upload.expiresAt) return { status: 403 };
    upload.fileUri = fileUri;
    return { status: 200 };
  }
}

export const MOCK_UPLOAD_ORIGIN = 'https://uploads.mock.nexahub.app';
