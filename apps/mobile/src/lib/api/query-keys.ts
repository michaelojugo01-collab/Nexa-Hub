import type { ListProductsQuery } from '@nexa/api-contract';

/** All query keys in one place so invalidation stays consistent. */
export const queryKeys = {
  me: ['me'] as const,
  discoverHome: ['discover', 'home'] as const,
  categories: ['discover', 'categories'] as const,
  usernameAvailability: (username: string) => ['usernames', username] as const,
  dataExport: ['me', 'data-export'] as const,
  /** Public store reads, by the slug in the URL. Prefix ['stores'] invalidates all of them. */
  store: (slug: string) => ['stores', slug] as const,
  stores: ['stores'] as const,
  myStore: ['me', 'store'] as const,
  slugAvailability: (slug: string) => ['slugs', slug] as const,
  products: (query: Omit<ListProductsQuery, 'cursor'> = {}) => ['products', query] as const,
  storeProducts: (slug: string) => ['products', { storeSlug: slug }, 'infinite'] as const,
};
