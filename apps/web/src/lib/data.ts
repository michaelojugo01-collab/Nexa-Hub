import { site } from '@nexa/config/site';
import {
  createApiClient,
  isApiError,
  type Product,
  type ProductSummary,
  type PublicProfile,
  type SitemapEntry,
  type Store,
} from '@nexa/api-contract';
import { createMockFetch } from '@nexa/mocks';
import { unstable_cache } from 'next/cache';

/**
 * Server-side data for the public pages. One switch: USE_MOCKS=true reads the shared mock
 * backend (@nexa/mocks, the same data as the app); otherwise the real API through the typed
 * client. Every read is cached for `site.revalidateSeconds`, which makes the pages refresh
 * (ISR) at most that often.
 *
 * Results are plain objects ("found", "redirect", "not-found") rather than thrown errors, so
 * they can be cached. Network and server errors are thrown and show the error page.
 */

export const useMocks = (process.env.USE_MOCKS ?? 'true') === 'true';

const fetchForMode = useMocks
  ? createMockFetch() // fresh in-memory mock backend, read-only here
  : (url: string, init: RequestInit) =>
      fetch(url, { ...init, next: { revalidate: site.revalidateSeconds } });

const api = createApiClient({
  baseUrl: useMocks ? 'https://mock.nexahub.local' : (process.env.API_URL ?? ''),
  fetch: fetchForMode,
});

export type Result<T> =
  { kind: 'found'; data: T } | { kind: 'redirect'; to: string } | { kind: 'not-found' };

/** 404, 410 (unpublished) and "private" all mean "no public page here". */
function missing(error: unknown): { kind: 'not-found' } {
  if (
    isApiError(error) &&
    (error.status === 404 || error.status === 410 || error.code === 'STORE_PRIVATE')
  ) {
    return { kind: 'not-found' };
  }
  throw error;
}

function cached<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>) {
  return unstable_cache(fn, ['web', name], {
    revalidate: site.revalidateSeconds,
    tags: [name],
  });
}

export type StorePageData = { store: Store; products: ProductSummary[] };

/** Store page: the store and its first products. Old slugs → redirect to the current one. */
export const getStorePage = cached(
  'store-page',
  async (slug: string): Promise<Result<StorePageData>> => {
    try {
      const store = await api.getStore(slug);
      if (store.visibility !== 'public') return { kind: 'not-found' };
      if (store.redirectTo && store.redirectTo !== slug) {
        return { kind: 'redirect', to: `/${store.redirectTo}` };
      }
      const page = await api.listProducts({ storeSlug: store.slug, limit: 24 });
      return { kind: 'found', data: { store, products: page.data } };
    } catch (error) {
      return missing(error);
    }
  },
);

/** Product page. A product under an old store slug → redirect to the current one. */
export const getProductPage = cached(
  'product-page',
  async (storeSlug: string, productSlug: string): Promise<Result<Product>> => {
    try {
      const product = await api.getPublicProduct(storeSlug, productSlug);
      if (product.redirectTo && product.redirectTo !== storeSlug) {
        return { kind: 'redirect', to: `/${product.redirectTo}/${product.slug}` };
      }
      return { kind: 'found', data: product };
    } catch (error) {
      return missing(error);
    }
  },
);

export const getProfilePage = cached(
  'profile-page',
  async (username: string): Promise<Result<PublicProfile>> => {
    try {
      return { kind: 'found', data: await api.getPublicProfile(username) };
    } catch (error) {
      return missing(error);
    }
  },
);

/** Every public page for sitemap.xml (public stores and live products only). */
export const getSitemapEntries = cached('sitemap', async (): Promise<SitemapEntry[]> => {
  const entries: SitemapEntry[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.listSitemap({ cursor, limit: 1000 });
    entries.push(...page.data);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && entries.length < 50_000); // one sitemap file holds 50,000 URLs
  return entries;
});

/** A few stores to prerender at build time; everything else renders on first visit. */
export const getFeaturedStoreSlugs = cached('featured-stores', async (): Promise<string[]> => {
  const home = await api.getDiscoverHome();
  return home.featuredStores.map((s) => s.slug);
});
