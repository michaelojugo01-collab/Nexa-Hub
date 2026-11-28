import { createApiClient, type ApiError } from '@nexa/api-contract';

import {
  createMockFetch,
  memoryPersistence,
  MOCK_OTP_CODE,
  MockAuthServer,
  MockStoreServer,
} from '@nexa/mocks';

const BASE = 'https://test.nexahub.ng';
const ADAEZE = '+2348031234567'; // seller, owns adaezeprints (slug already changed once)
const CHIDI = '+2348055550000'; // buyer, follows studysmartabuja + jollofacademy
const NEW_USER = '+2348091112222';

function setup() {
  const auth = new MockAuthServer({ persistence: memoryPersistence(), accessTokenTtlSec: 900 });
  const storePersistence = memoryPersistence();
  const stores = new MockStoreServer({ auth, persistence: storePersistence });
  const fetch = createMockFetch({ server: auth, stores });
  const anon = createApiClient({ baseUrl: BASE, fetch });

  async function as(phone: string) {
    const { challengeId } = await anon.requestOtp({ phone, channel: 'sms' });
    const session = await anon.verifyOtp({ challengeId, code: MOCK_OTP_CODE, deviceId: 'd1' });
    return createApiClient({
      baseUrl: BASE,
      fetch,
      auth: {
        getAccessToken: () => session.accessToken,
        refresh: async () => null,
        onSessionEnded: () => {},
      },
    });
  }

  async function newSeller() {
    const api = await as(NEW_USER);
    await api.becomeSeller();
    return api;
  }

  return { auth, stores, fetch, anon, as, newSeller, storePersistence };
}

const fail = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('Expected the request to fail');
    },
    (e: ApiError) => e,
  );

const create = {
  name: 'Bisi Bakes',
  slug: 'bisibakes',
  categorySlug: 'food',
  bio: 'Small chops and cakes.',
};

describe('mock stores: slugs', () => {
  it('reports available, taken (current and old slugs), reserved and invalid', async () => {
    const { newSeller } = setup();
    const api = await newSeller();
    await expect(api.checkSlug('bisibakes')).resolves.toMatchObject({ available: true });
    await expect(api.checkSlug('adaezeprints')).resolves.toMatchObject({ reason: 'taken' });
    await expect(api.checkSlug('adaezestudio')).resolves.toMatchObject({ reason: 'taken' });
    for (const reserved of [
      'admin',
      'nexa',
      'support',
      'help',
      'store',
      'api',
      'app',
      'settings',
      'login',
      'davido',
      'welcome',
    ]) {
      await expect(api.checkSlug(reserved)).resolves.toMatchObject({ reason: 'reserved' });
    }
    for (const invalid of ['ab', 'Bisi', 'bisi--bakes', '-bisi', 'a'.repeat(31)]) {
      await expect(api.checkSlug(invalid)).resolves.toMatchObject({ reason: 'invalid' });
    }
  });

  it('refuses taken, reserved and invalid slugs on create', async () => {
    const { newSeller } = setup();
    const api = await newSeller();
    expect((await fail(api.createStore({ ...create, slug: 'jollofacademy' }))).code).toBe(
      'SLUG_TAKEN',
    );
    expect((await fail(api.createStore({ ...create, slug: 'admin' }))).code).toBe('SLUG_RESERVED');
    expect((await fail(api.createStore({ ...create, slug: 'Bisi Bakes' }))).code).toBe(
      'SLUG_INVALID',
    );
  });

  it('allows one slug change; the old slug then redirects', async () => {
    const { newSeller, anon } = setup();
    const api = await newSeller();
    const created = await api.createStore(create);
    expect(created.slugChangesRemaining).toBe(1);

    const renamed = await api.updateStore({ slug: 'bisicakes' });
    expect(renamed).toMatchObject({
      slug: 'bisicakes',
      previousSlug: 'bisibakes',
      slugChangesRemaining: 0,
    });

    await expect(anon.getStore('bisibakes')).resolves.toMatchObject({
      slug: 'bisicakes',
      redirectTo: 'bisicakes',
    });
    await expect(anon.getStore('bisicakes')).resolves.toMatchObject({ redirectTo: null });

    expect((await fail(api.updateStore({ slug: 'bisitreats' }))).code).toBe('SLUG_CHANGE_USED');
    // Other edits still work, and keeping the same slug is not a change.
    await expect(api.updateStore({ slug: 'bisicakes', name: 'Bisi Cakes' })).resolves.toMatchObject(
      { name: 'Bisi Cakes' },
    );
  });

  it('serves the fixture old slug as a redirect', async () => {
    const { anon } = setup();
    await expect(anon.getStore('adaezestudio')).resolves.toMatchObject({
      slug: 'adaezeprints',
      redirectTo: 'adaezeprints',
    });
  });
});

describe('mock stores: create, read, visibility', () => {
  it('needs the seller role and allows one store per seller', async () => {
    const { as, newSeller } = setup();
    const buyer = await as(CHIDI);
    expect((await fail(buyer.createStore(create))).code).toBe('NOT_SELLER');

    const seller = await newSeller();
    await expect(seller.getMyStore()).rejects.toMatchObject({ status: 404 });
    const store = await seller.createStore(create);
    expect(store).toMatchObject({
      slug: 'bisibakes',
      isOwner: true,
      visibility: 'public',
      followerCount: 0,
    });
    expect((await seller.getMe()).store).toMatchObject({ slug: 'bisibakes' });
    expect((await fail(seller.createStore({ ...create, slug: 'bisi-two' }))).code).toBe(
      'STORE_EXISTS',
    );
  });

  it('limits the bio to 150 characters', async () => {
    const { newSeller } = setup();
    const api = await newSeller();
    const error = await fail(api.createStore({ ...create, bio: 'a'.repeat(151) }));
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    await expect(api.createStore({ ...create, bio: 'a'.repeat(150) })).resolves.toBeDefined();
  });

  it('hides private stores from everyone but the owner', async () => {
    const { anon, as, newSeller } = setup();
    expect((await fail(anon.getStore('lensbyemeka'))).code).toBe('STORE_PRIVATE');

    const seller = await newSeller();
    await seller.createStore(create);
    await seller.updateStore({ visibility: 'private' });
    expect((await fail(anon.getStore('bisibakes'))).code).toBe('STORE_PRIVATE');
    expect((await fail((await as(CHIDI)).getStore('bisibakes'))).status).toBe(403);
    expect((await fail(anon.listProducts({ storeSlug: 'bisibakes' }))).code).toBe('STORE_PRIVATE');
    await expect(seller.getStore('bisibakes')).resolves.toMatchObject({
      visibility: 'private',
      isOwner: true,
    });
  });

  it('returns 404 for unknown stores', async () => {
    const { anon } = setup();
    expect((await fail(anon.getStore('no-such-store'))).code).toBe('NOT_FOUND');
  });
});

describe('mock stores: follows', () => {
  it('follows and unfollows idempotently and counts followers', async () => {
    const { as, anon } = setup();
    const chidi = await as(CHIDI);
    const before = await chidi.getStore('kolacreates');
    expect(before.isFollowing).toBe(false);

    const followed = await chidi.followStore(before.id);
    expect(followed).toEqual({
      storeId: before.id,
      following: true,
      followerCount: before.followerCount + 1,
    });
    await expect(chidi.followStore(before.id)).resolves.toMatchObject({
      followerCount: before.followerCount + 1,
    });
    await expect(chidi.getStore('kolacreates')).resolves.toMatchObject({ isFollowing: true });
    // Signed-out readers never see isFollowing.
    await expect(anon.getStore('kolacreates')).resolves.toMatchObject({ isFollowing: false });

    await expect(chidi.unfollowStore(before.id)).resolves.toMatchObject({
      following: false,
      followerCount: before.followerCount,
    });
    await expect(chidi.unfollowStore(before.id)).resolves.toMatchObject({
      followerCount: before.followerCount,
    });
  });

  it('shows the fixture follows and refuses following your own store', async () => {
    const { as } = setup();
    const chidi = await as(CHIDI);
    await expect(chidi.getStore('studysmartabuja')).resolves.toMatchObject({ isFollowing: true });
    const adaeze = await as(ADAEZE);
    const own = await adaeze.getStore('adaezeprints');
    expect(own.isOwner).toBe(true);
    expect((await fail(adaeze.followStore(own.id))).code).toBe('CANNOT_FOLLOW_OWN_STORE');
  });

  it('needs a signed-in user', async () => {
    const { anon } = setup();
    expect((await fail(anon.followStore('str_kola'))).status).toBe(401);
  });

  it('survives a restart of the mock backend', async () => {
    const { as, auth, storePersistence } = setup();
    const chidi = await as(CHIDI);
    await chidi.followStore('str_kola');
    const restarted = new MockStoreServer({ auth, persistence: storePersistence });
    const api = createApiClient({
      baseUrl: BASE,
      fetch: createMockFetch({ server: auth, stores: restarted }),
    });
    await expect(api.getStore('kolacreates')).resolves.toMatchObject({ followerCount: 2151 });
  });
});

describe('mock stores: uploads', () => {
  it('checks type and size per kind', async () => {
    const { newSeller } = setup();
    const api = await newSeller();
    const type = await fail(
      api.requestStoreUpload({
        kind: 'avatar',
        contentType: 'image/gif' as never,
        sizeBytes: 1000,
      }),
    );
    expect(type.code).toBe('FILE_TYPE_NOT_ALLOWED');
    const avatar = await fail(
      api.requestStoreUpload({
        kind: 'avatar',
        contentType: 'image/jpeg',
        sizeBytes: 5 * 1024 * 1024 + 1,
      }),
    );
    expect(avatar).toMatchObject({
      code: 'FILE_TOO_LARGE',
      message: 'Profile pictures can be up to 5 MB.',
    });
    // 6 MB is too big for an avatar but fine for a banner (10 MB).
    await expect(
      api.requestStoreUpload({
        kind: 'banner',
        contentType: 'image/webp',
        sizeBytes: 6 * 1024 * 1024,
      }),
    ).resolves.toMatchObject({ method: 'PUT', maxBytes: 10 * 1024 * 1024 });
    const banner = await fail(
      api.requestStoreUpload({
        kind: 'banner',
        contentType: 'image/png',
        sizeBytes: 10 * 1024 * 1024 + 1,
      }),
    );
    expect(banner.code).toBe('FILE_TOO_LARGE');
  });

  it('turns a received upload into three variants on the store', async () => {
    const { newSeller, stores } = setup();
    const api = await newSeller();
    const ticket = await api.requestStoreUpload({
      kind: 'avatar',
      contentType: 'image/jpeg',
      sizeBytes: 120_000,
    });
    // Not uploaded yet: refused.
    expect((await fail(api.createStore({ ...create, avatarUploadId: ticket.uploadId }))).code).toBe(
      'VALIDATION_ERROR',
    );
    stores.receiveUpload(ticket.uploadId, 'file:///cache/avatar.jpg');
    const store = await api.createStore({ ...create, avatarUploadId: ticket.uploadId });
    expect(store.avatar).toEqual({
      small: 'file:///cache/avatar.jpg',
      medium: 'file:///cache/avatar.jpg',
      large: 'file:///cache/avatar.jpg',
    });
    expect(store.avatarUrl).toBe('file:///cache/avatar.jpg');
    // An upload id is used once; null removes the image.
    await expect(api.updateStore({ avatarUploadId: null })).resolves.toMatchObject({
      avatar: null,
      avatarUrl: null,
    });
  });

  it('refuses another seller’s upload or the wrong kind', async () => {
    const { as, newSeller, stores } = setup();
    const adaeze = await as(ADAEZE);
    const ticket = await adaeze.requestStoreUpload({
      kind: 'banner',
      contentType: 'image/jpeg',
      sizeBytes: 1000,
    });
    stores.receiveUpload(ticket.uploadId, 'file:///x.jpg');
    const other = await newSeller();
    expect(
      (await fail(other.createStore({ ...create, bannerUploadId: ticket.uploadId }))).code,
    ).toBe('VALIDATION_ERROR');
    expect((await fail(adaeze.updateStore({ avatarUploadId: ticket.uploadId }))).code).toBe(
      'VALIDATION_ERROR',
    );
  });
});
