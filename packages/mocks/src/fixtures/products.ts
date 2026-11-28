import type { Product, ProductSummary, ProductType } from '@nexa/api-contract';

import { slugify } from './slugify';
import { stores, toSummary } from './stores';

const ngn = (amountKobo: number) => ({ amountKobo, currency: 'NGN' as const });

type Seed = [
  title: string,
  storeSlug: string,
  type: ProductType,
  priceKobo: number,
  compareAtKobo: number | null,
  featured: boolean,
  description: string,
];

/** Newest first. */
const seeds: Seed[] = [
  [
    'Ankara Print Pattern Pack (40 designs)',
    'adaezeprints',
    'digital',
    450000,
    null,
    true,
    '40 hand-drawn Ankara patterns as print-ready PNG and SVG files. Use them for fabric, packaging or social posts.',
  ],
  [
    'JAMB Physics Past Questions 2015–2025',
    'studysmartabuja',
    'ebook',
    150000,
    250000,
    false,
    'Eleven years of JAMB Physics questions with worked answers and the formulas you need. PDF, 210 pages.',
  ],
  [
    'Logo design — 3 concepts',
    'kolacreates',
    'service',
    2500000,
    null,
    false,
    'Three logo concepts for your business, two rounds of changes, and final files for print and social media.',
  ],
  [
    'Party Jollof Masterclass',
    'jollofacademy',
    'course',
    750000,
    1000000,
    true,
    'Cook smoky party jollof for 50 guests. 9 short videos: the base, the rice, the bottom-pot and timing.',
  ],
  [
    'Amapiano Beat Pack Vol. 3',
    'beatsbytobi',
    'digital',
    1200000,
    null,
    false,
    '12 amapiano instrumentals with stems. Non-exclusive licence for streaming and live shows.',
  ],
  [
    'Raw Shea Butter (500g)',
    'amakaskincare',
    'physical',
    650000,
    null,
    true,
    'Unrefined shea butter from Kwara, hand-packed in Enugu. Ships anywhere in Nigeria in 2–5 days.',
  ],
  [
    'Adire Textile Mockups',
    'adaezeprints',
    'digital',
    300000,
    null,
    false,
    'Photo mockups for adire and tie-dye designs: wrappers, tote bags and shirts. Editable layers.',
  ],
  [
    'WAEC Chemistry Practicals Guide',
    'studysmartabuja',
    'ebook',
    120000,
    null,
    false,
    'Step-by-step guide to WAEC Chemistry practicals: titration, salt analysis and how marks are given.',
  ],
  [
    'Flyer design (24-hour delivery)',
    'kolacreates',
    'service',
    1500000,
    null,
    false,
    'One event or business flyer, delivered within 24 hours, sized for WhatsApp status and Instagram.',
  ],
  [
    'Small Chops for Events (video course)',
    'jollofacademy',
    'course',
    500000,
    null,
    false,
    'Puff-puff, samosa, spring rolls and peppered gizzard for events, with costing per 100 guests.',
  ],
  [
    'Afrobeats Drum Kit',
    'beatsbytobi',
    'digital',
    850050,
    null,
    false,
    '250 one-shots and loops: shakers, talking drum, log drums and claps. WAV, 24-bit.',
  ],
  [
    'African Black Soap (3 bars)',
    'amakaskincare',
    'physical',
    450000,
    550000,
    false,
    'Three bars of handmade black soap with shea and palm kernel oil. Gentle on oily and acne-prone skin.',
  ],
  [
    'Aso-Ebi Colour Palette Guide',
    'adaezeprints',
    'ebook',
    200000,
    null,
    false,
    '30 aso-ebi colour palettes with fabric and gele pairings, for planners and families.',
  ],
  [
    'Post-UTME Unilag Past Questions',
    'studysmartabuja',
    'ebook',
    180000,
    null,
    true,
    'UNILAG post-UTME questions for science and arts, with answers and a 2-week study plan.',
  ],
  [
    'Brand Starter Kit for Instagram',
    'kolacreates',
    'digital',
    900000,
    1200000,
    false,
    '30 editable Instagram templates, highlight covers and a colour guide for small businesses.',
  ],
  [
    'Pepper Soup Spice Blend Recipe',
    'jollofacademy',
    'ebook',
    150000,
    null,
    false,
    'The house pepper soup blend, measured for home and for catering, with goat and catfish recipes.',
  ],
  [
    'Exclusive Beat Licence',
    'beatsbytobi',
    'service',
    5000000,
    null,
    false,
    'Exclusive rights to one beat of your choice, removed from sale after purchase. Stems included.',
  ],
  [
    'Glow Body Oil (100ml)',
    'amakaskincare',
    'physical',
    380000,
    null,
    false,
    'Light body oil with carrot seed and sweet almond. Absorbs fast, no greasy feel.',
  ],
  [
    'Gele Tying Tutorial Bundle',
    'adaezeprints',
    'course',
    600000,
    null,
    false,
    'Six gele styles in short videos, from the classic fan to the 2026 owambe wrap.',
  ],
  [
    'NECO Mathematics Solutions',
    'studysmartabuja',
    'ebook',
    100000,
    null,
    false,
    'Full worked solutions to NECO Mathematics papers 2018–2025.',
  ],
  [
    'Business Card Design',
    'kolacreates',
    'service',
    800000,
    null,
    false,
    'Double-sided business card design with print-ready files and a digital version for WhatsApp.',
  ],
  [
    'Nigerian Soups Cookbook',
    'jollofacademy',
    'ebook',
    250000,
    null,
    false,
    'Egusi, ogbono, banga, afang and 16 more soups, with shopping lists for small and big pots.',
  ],
  [
    'Street-Pop Vocal Samples',
    'beatsbytobi',
    'digital',
    400000,
    null,
    false,
    'Royalty-free street-pop ad-libs, chants and hooks, tempo-labelled and ready to drop in.',
  ],
  [
    'Skincare Routine Consultation',
    'amakaskincare',
    'service',
    1000000,
    null,
    false,
    'A 30-minute video call and a written routine for your skin type and budget.',
  ],
  [
    'Kente-Inspired Wallpaper Set',
    'adaezeprints',
    'digital',
    99900,
    null,
    false,
    '12 phone and desktop wallpapers inspired by kente weaves.',
  ],
  // A live product in the private store: never listed, shown or put in the sitemap.
  [
    'Owambe Glow Lightroom Presets',
    'lensbyemeka',
    'digital',
    350000,
    null,
    false,
    '10 Lightroom presets for warm, glowing party photos. Mobile and desktop.',
  ],
];

/** Drafts: exist on the server but are not published (404 on the web, not in the sitemap). */
const draftSeeds: Seed[] = [
  ['Asoke Pattern Pack (coming soon)', 'adaezeprints', 'digital', 500000, null, false, 'Draft.'],
  ['Catering Business Masterclass', 'jollofacademy', 'course', 2000000, null, false, 'Draft.'],
];

/** A product as the mock backend keeps it, including drafts. */
export type ProductRecord = Product & { status: 'live' | 'draft'; updatedAt: string };

function storeOf(slug: string) {
  const store = stores.find((s) => s.slug === slug);
  if (!store) throw new Error(`Fixture product references unknown store "${slug}"`);
  return store;
}

const DAY = 86_400_000;
const NEWEST = Date.parse('2026-11-27T09:00:00Z');

function toRecord(seed: Seed, i: number, status: ProductRecord['status']): ProductRecord {
  const [title, storeSlug, type, priceKobo, compareAtKobo, featured, description] = seed;
  const store = storeOf(storeSlug);
  const n = status === 'live' ? i + 1 : 900 + i;
  const imageUrl = n % 5 === 0 ? null : `https://picsum.photos/seed/nexa-prd-${n}/600/600`;
  const publishedAt = new Date(NEWEST - i * DAY).toISOString();
  return {
    id: `prd_${String(n).padStart(3, '0')}`,
    slug: slugify(title),
    title,
    type,
    price: ngn(priceKobo),
    compareAtPrice: compareAtKobo === null ? null : ngn(compareAtKobo),
    imageUrl,
    store: { slug: store.slug, name: store.name },
    featured,
    description,
    images: imageUrl ? [imageUrl, `https://picsum.photos/seed/nexa-prd-${n}-b/600/600`] : [],
    storeInfo: toSummary(store),
    publishedAt,
    redirectTo: null,
    status,
    updatedAt: new Date(NEWEST - i * DAY + 3_600_000).toISOString(),
  };
}

/** Every product the mock backend knows, live and draft. */
export const productRecords: ProductRecord[] = [
  ...seeds.map((seed, i) => toRecord(seed, i, 'live')),
  ...draftSeeds.map((seed, i) => toRecord(seed, i, 'draft')),
];

export function toProductSummary(record: ProductRecord): ProductSummary {
  const { id, slug, title, type, price, compareAtPrice, imageUrl, store, featured } = record;
  return { id, slug, title, type, price, compareAtPrice, imageUrl, store, featured };
}

/**
 * Live products of public stores, newest first, as GET /v1/products returns them.
 * (Visibility can change at runtime in the mock; the handler filters again.)
 */
export const products: ProductSummary[] = productRecords
  .filter((p) => p.status === 'live' && storeOf(p.store.slug).visibility === 'public')
  .map(toProductSummary);
