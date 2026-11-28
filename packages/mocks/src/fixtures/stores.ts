import type { ImageVariants, Store, StoreSummary } from '@nexa/api-contract';

import { categories } from './categories';

const square = (seed: string): ImageVariants => ({
  small: `https://picsum.photos/seed/nexa-${seed}/96/96`,
  medium: `https://picsum.photos/seed/nexa-${seed}/240/240`,
  large: `https://picsum.photos/seed/nexa-${seed}/480/480`,
});
const wide = (seed: string): ImageVariants => ({
  small: `https://picsum.photos/seed/nexa-${seed}/480/160`,
  medium: `https://picsum.photos/seed/nexa-${seed}/960/320`,
  large: `https://picsum.photos/seed/nexa-${seed}/1500/500`,
});

const category = (slug: string) => {
  const found = categories.find((c) => c.slug === slug);
  if (!found) throw new Error(`Fixture store references unknown category "${slug}"`);
  return found;
};

/**
 * A store as the mock backend keeps it. Per-viewer fields (isFollowing, isOwner, redirectTo)
 * are computed per request; `ownerId` and the slug-change fields are server-side only.
 */
export type StoreRecord = Omit<Store, 'isFollowing' | 'isOwner' | 'redirectTo'> & {
  ownerId: string;
  previousSlug: string | null;
  slugChangesRemaining: number;
};

type Seed = {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  location: string | null;
  verified: boolean;
  followerCount: number;
  bio: string | null;
  category: string;
  avatar: string | null;
  banner: string | null;
  productCount: number;
  createdAt: string;
  visibility?: Store['visibility'];
  previousSlug?: string;
};

const seeds: Seed[] = [
  {
    id: 'str_adaeze',
    slug: 'adaezeprints',
    name: 'Adaeze Prints',
    ownerId: 'usr_adaeze',
    location: 'Yaba, Lagos',
    verified: true,
    followerCount: 12480,
    bio: 'Hand-drawn Ankara patterns and print-ready textile designs.',
    category: 'fashion',
    avatar: 'adaeze',
    banner: 'adaeze-cover',
    productCount: 36,
    createdAt: '2026-10-02T09:20:00Z',
    // Adaeze already used her one slug change: the old link redirects.
    previousSlug: 'adaezestudio',
  },
  {
    id: 'str_studysmart',
    slug: 'studysmartabuja',
    name: 'StudySmart Abuja',
    ownerId: 'usr_tunde',
    location: 'Wuse 2, Abuja',
    verified: true,
    followerCount: 8930,
    bio: 'JAMB, WAEC and post-UTME past questions with worked answers.',
    category: 'education',
    avatar: 'studysmart',
    banner: null,
    productCount: 22,
    createdAt: '2026-09-14T11:00:00Z',
  },
  {
    id: 'str_kola',
    slug: 'kolacreates',
    name: 'Kola Creates',
    ownerId: 'usr_kola',
    location: 'Ikeja, Lagos',
    verified: false,
    followerCount: 2150,
    bio: 'Logos, flyers and brand kits for small businesses.',
    category: 'design',
    avatar: null,
    banner: null,
    productCount: 9,
    createdAt: '2026-10-20T15:30:00Z',
  },
  {
    id: 'str_jollof',
    slug: 'jollofacademy',
    name: 'Jollof Academy',
    ownerId: 'usr_ngozi',
    location: 'Port Harcourt, Rivers',
    verified: true,
    followerCount: 21400,
    bio: 'Video cooking classes: party jollof, small chops and more.',
    category: 'food',
    avatar: 'jollof',
    banner: 'jollof-cover',
    productCount: 14,
    createdAt: '2026-08-30T08:00:00Z',
  },
  {
    id: 'str_beatsbytobi',
    slug: 'beatsbytobi',
    name: 'Beats by Tobi',
    ownerId: 'usr_tobi',
    location: 'Ibadan, Oyo',
    verified: false,
    followerCount: 4720,
    bio: 'Afrobeats and amapiano instrumentals with licences.',
    category: 'music',
    avatar: 'tobi',
    banner: 'tobi-cover',
    productCount: 48,
    createdAt: '2026-11-01T19:45:00Z',
  },
  {
    id: 'str_amakaskin',
    slug: 'amakaskincare',
    name: 'Amaka Skincare',
    ownerId: 'usr_amaka',
    location: 'Enugu',
    verified: true,
    followerCount: 15300,
    bio: 'Handmade shea butter and black soap, shipped nationwide.',
    category: 'beauty',
    avatar: 'amaka',
    banner: null,
    productCount: 18,
    createdAt: '2026-09-05T10:10:00Z',
  },
  {
    id: 'str_funmifit',
    slug: 'fitwithfunmi',
    name: 'Fit with Funmi',
    ownerId: 'usr_funmi',
    location: 'Lekki, Lagos',
    verified: false,
    followerCount: 640,
    bio: '12-week home workout plans and meal guides. No gym needed.',
    category: 'fitness',
    avatar: 'funmi',
    banner: 'funmi-cover',
    productCount: 0,
    createdAt: '2026-11-20T07:30:00Z',
  },
  {
    id: 'str_zainab',
    slug: 'wordsbyzainab',
    name: 'Words by Zainab',
    ownerId: 'usr_zainab',
    location: 'Kano',
    verified: false,
    followerCount: 1210,
    bio: 'Short stories and poetry in English and Hausa. E-books and audiobooks.',
    category: 'books',
    avatar: 'zainab',
    banner: null,
    productCount: 0,
    createdAt: '2026-11-12T16:00:00Z',
  },
  {
    id: 'str_emeka',
    slug: 'lensbyemeka',
    name: 'Lens by Emeka',
    ownerId: 'usr_emeka',
    location: 'Owerri, Imo',
    verified: false,
    followerCount: 87,
    bio: 'Lightroom presets and wedding photography. Opening soon.',
    category: 'photography',
    avatar: 'emeka',
    banner: 'emeka-cover',
    productCount: 1,
    createdAt: '2026-11-25T12:00:00Z',
    visibility: 'private',
  },
];

function toRecord(seed: Seed): StoreRecord {
  const avatar = seed.avatar ? square(seed.avatar) : null;
  const banner = seed.banner ? wide(seed.banner) : null;
  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    avatarUrl: avatar?.medium ?? null,
    location: seed.location,
    verified: seed.verified,
    followerCount: seed.followerCount,
    bio: seed.bio,
    coverUrl: banner?.large ?? null,
    productCount: seed.productCount,
    createdAt: seed.createdAt,
    category: category(seed.category),
    avatar,
    banner,
    visibility: seed.visibility ?? 'public',
    ownerId: seed.ownerId,
    previousSlug: seed.previousSlug ?? null,
    slugChangesRemaining: seed.previousSlug ? 0 : 1,
  };
}

/** Fresh copies each call, so the mock backend can mutate its own. */
export function storeRecords(): StoreRecord[] {
  return seeds.map(toRecord);
}

/** Who follows what at the start (user id → store ids). */
export const fixtureFollows: Record<string, string[]> = {
  usr_chidi: ['str_studysmart', 'str_jollof'],
};

/** A record as a signed-out visitor sees it. */
export function toPublicStore(record: StoreRecord): Store {
  const { ownerId: _o, previousSlug: _p, slugChangesRemaining: _s, ...store } = record;
  return { ...store, isFollowing: false, isOwner: false, redirectTo: null };
}

/** Every fixture store as a signed-out visitor sees it (including the private one). */
export const stores: Store[] = storeRecords().map(toPublicStore);

export function toSummary(store: Pick<Store, keyof StoreSummary>): StoreSummary {
  const { id, slug, name, avatarUrl, location, verified, followerCount } = store;
  return { id, slug, name, avatarUrl, location, verified, followerCount };
}

export function findStore(slug: string) {
  return stores.find((s) => s.slug === slug);
}

/**
 * Store links nobody can claim. Real list lives on the server; it also covers well-known
 * creators and brands (impersonation), and every top-level app route, since store links
 * share the URL space with screens (nexahub.app/{slug}).
 */
export const reservedSlugs = [
  // Platform words
  'admin',
  'administrator',
  'nexa',
  'nexahub',
  'support',
  'help',
  'store',
  'stores',
  'shop',
  'api',
  'app',
  'settings',
  'login',
  'logout',
  'signin',
  'signup',
  'official',
  'payments',
  'payouts',
  'security',
  'about',
  'terms',
  'privacy',
  // App routes
  'welcome',
  'phone',
  'verify',
  'account',
  'discover',
  'messages',
  'profile',
  'dev',
  'search',
  // Public web pages and files (F3): nexahub.app/{slug} must never clash with them
  'sitemap',
  'sitemap.xml',
  'robots',
  'robots.txt',
  'well-known',
  '.well-known',
  'download',
  'get',
  'open',
  'go',
  'link',
  'links',
  'blog',
  'careers',
  'contact',
  'press',
  'legal',
  'cookies',
  'faq',
  'status',
  'static',
  'assets',
  'images',
  'img',
  'public',
  '_next',
  'favicon.ico',
  'manifest.json',
  'apple-app-site-association',
  'user',
  'users',
  'product',
  'products',
  'not-found',
  '404',
  // Well-known Nigerian creators and brands (stand-in for the impersonation list)
  'davido',
  'wizkid',
  'burnaboy',
  'tiwasavage',
  'mrmacaroni',
  'taaooma',
  'falzthebahdguy',
  'dangote',
  'mtn',
  'glo',
  'jumia',
  'paystack',
  'flutterwave',
];
