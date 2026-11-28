import { createApiClient, isApiError, type ProductSummary } from '@nexa/api-contract';

import { createMockFetch, products, stores } from '@nexa/mocks';

const api = createApiClient({ baseUrl: 'https://test.nexahub.ng', fetch: createMockFetch() });

describe('mock API through the typed client', () => {
  it('pages through every product with cursors, without gaps or repeats', async () => {
    const seen: ProductSummary[] = [];
    let cursor: string | undefined;
    do {
      const page = await api.listProducts({ limit: 7, cursor });
      seen.push(...page.data);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    expect(seen.map((p) => p.id)).toEqual(products.map((p) => p.id));
  });

  it('keeps every price an integer number of kobo in NGN', () => {
    for (const p of products) {
      expect(Number.isSafeInteger(p.price.amountKobo)).toBe(true);
      expect(p.price.currency).toBe('NGN');
    }
  });

  it('filters products by store', async () => {
    const page = await api.listProducts({ storeSlug: 'adaezeprints', limit: 50 });
    expect(page.data.length).toBeGreaterThan(0);
    expect(page.data.every((p) => p.store.slug === 'adaezeprints')).toBe(true);
    expect(page.nextCursor).toBeNull();
  });

  it('returns a store by slug', async () => {
    // productCount is live: the listed products of the store (F4).
    await expect(api.getStore('adaezeprints')).resolves.toEqual({ ...stores[0], productCount: 6 });
  });

  it('throws an ApiError with the contract error shape for unknown stores', async () => {
    const error = await api.getStore('nope').catch((e: unknown) => e);
    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('rejects an out-of-range limit like the contract says', async () => {
    await expect(api.listProducts({ limit: 51 })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('fails with a retryable 500 at the configured failure rate', async () => {
    const failing = createApiClient({
      baseUrl: 'https://test.nexahub.ng',
      fetch: createMockFetch({ failureRate: 1 }),
    });
    await expect(failing.getMe()).rejects.toMatchObject({ status: 500, isRetryable: true });
  });
});
