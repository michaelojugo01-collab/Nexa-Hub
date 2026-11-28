import type { Store, StoreSummary } from '@nexa/api-contract';

const img = (seed: string) => `https://picsum.photos/seed/nexa-${seed}/400/400`;
const cover = (seed: string) => `https://picsum.photos/seed/nexa-${seed}/1200/400`;

export const stores: Store[] = [
  {
    id: 'str_adaeze',
    slug: 'adaezeprints',
    name: 'Adaeze Prints',
    avatarUrl: img('adaeze'),
    location: 'Yaba, Lagos',
    verified: true,
    followerCount: 12480,
    bio: 'Hand-drawn Ankara patterns and print-ready textile designs.',
    coverUrl: cover('adaeze-cover'),
    productCount: 36,
    isFollowing: false,
    createdAt: '2026-10-02T09:20:00Z',
  },
  {
    id: 'str_studysmart',
    slug: 'studysmartabuja',
    name: 'StudySmart Abuja',
    avatarUrl: img('studysmart'),
    location: 'Wuse 2, Abuja',
    verified: true,
    followerCount: 8930,
    bio: 'JAMB, WAEC and post-UTME past questions with worked answers.',
    coverUrl: null,
    productCount: 22,
    isFollowing: true,
    createdAt: '2026-09-14T11:00:00Z',
  },
  {
    id: 'str_kola',
    slug: 'kolacreates',
    name: 'Kola Creates',
    avatarUrl: null,
    location: 'Ikeja, Lagos',
    verified: false,
    followerCount: 2150,
    bio: 'Logos, flyers and brand kits for small businesses.',
    coverUrl: null,
    productCount: 9,
    isFollowing: false,
    createdAt: '2026-10-20T15:30:00Z',
  },
  {
    id: 'str_jollof',
    slug: 'jollofacademy',
    name: 'Jollof Academy',
    avatarUrl: img('jollof'),
    location: 'Port Harcourt, Rivers',
    verified: true,
    followerCount: 21400,
    bio: 'Video cooking classes: party jollof, small chops and more.',
    coverUrl: cover('jollof-cover'),
    productCount: 14,
    isFollowing: false,
    createdAt: '2026-08-30T08:00:00Z',
  },
  {
    id: 'str_beatsbytobi',
    slug: 'beatsbytobi',
    name: 'Beats by Tobi',
    avatarUrl: img('tobi'),
    location: 'Ibadan, Oyo',
    verified: false,
    followerCount: 4720,
    bio: 'Afrobeats and amapiano instrumentals with licences.',
    coverUrl: null,
    productCount: 48,
    isFollowing: false,
    createdAt: '2026-11-01T19:45:00Z',
  },
  {
    id: 'str_amakaskin',
    slug: 'amakaskincare',
    name: 'Amaka Skincare',
    avatarUrl: img('amaka'),
    location: 'Enugu',
    verified: true,
    followerCount: 15300,
    bio: 'Handmade shea butter and black soap, shipped nationwide.',
    coverUrl: null,
    productCount: 18,
    isFollowing: false,
    createdAt: '2026-09-05T10:10:00Z',
  },
];

export function toSummary(store: Store): StoreSummary {
  const { id, slug, name, avatarUrl, location, verified, followerCount } = store;
  return { id, slug, name, avatarUrl, location, verified, followerCount };
}

export function findStore(slug: string) {
  return stores.find((s) => s.slug === slug);
}
