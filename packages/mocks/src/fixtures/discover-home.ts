import type { DiscoverHome } from '@nexa/api-contract';

import { products } from './products';
import { stores, toSummary } from './stores';

export const discoverHome: DiscoverHome = {
  featuredStores: stores.filter((s) => s.verified && s.visibility === 'public').map(toSummary),
  trendingProducts: [...products]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 8),
  newProducts: products.slice(0, 10),
};

export const discoverHomeEmpty: DiscoverHome = {
  featuredStores: [],
  trendingProducts: [],
  newProducts: [],
};
