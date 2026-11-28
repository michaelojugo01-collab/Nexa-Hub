import type { ListProductsQuery } from '@nexa/api-contract';

/** All query keys in one place so invalidation stays consistent. */
export const queryKeys = {
  me: ['me'] as const,
  discoverHome: ['discover', 'home'] as const,
  store: (slug: string) => ['stores', slug] as const,
  products: (query: Omit<ListProductsQuery, 'cursor'> = {}) => ['products', query] as const,
};
