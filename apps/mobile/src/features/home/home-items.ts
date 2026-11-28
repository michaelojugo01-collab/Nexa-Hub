import type { DiscoverHome, ProductSummary, ProductType } from '@nexa/api-contract';

/** Flattened rows for the Home FlashList: section headings span both columns, products fill a grid. */
export type HomeItem =
  | { kind: 'heading'; key: string; title: string }
  | { kind: 'stores'; key: string; stores: DiscoverHome['featuredStores'] }
  | { kind: 'product'; key: string; product: ProductSummary };

export function isHomeEmpty(home: DiscoverHome) {
  return (
    home.featuredStores.length === 0 &&
    home.trendingProducts.length === 0 &&
    home.newProducts.length === 0
  );
}

export function toHomeItems(home: DiscoverHome): HomeItem[] {
  const items: HomeItem[] = [];

  if (home.featuredStores.length > 0) {
    items.push({ kind: 'heading', key: 'h-stores', title: 'Featured stores' });
    items.push({ kind: 'stores', key: 'stores', stores: home.featuredStores });
  }
  if (home.trendingProducts.length > 0) {
    items.push({ kind: 'heading', key: 'h-trending', title: 'Trending now' });
    for (const product of home.trendingProducts) {
      items.push({ kind: 'product', key: `t-${product.id}`, product });
    }
  }
  if (home.newProducts.length > 0) {
    items.push({ kind: 'heading', key: 'h-new', title: 'New this week' });
    for (const product of home.newProducts) {
      items.push({ kind: 'product', key: `n-${product.id}`, product });
    }
  }
  return items;
}

export const productTypeLabel: Record<ProductType, string> = {
  digital: 'Digital',
  ebook: 'Ebook',
  course: 'Course',
  service: 'Service',
  physical: 'Physical',
};
