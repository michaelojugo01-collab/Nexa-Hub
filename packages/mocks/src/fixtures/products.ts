import type { ProductSummary, ProductType } from '@nexa/api-contract';

import { stores } from './stores';

const ngn = (amountKobo: number) => ({ amountKobo, currency: 'NGN' as const });

type Seed = [
  title: string,
  storeSlug: string,
  type: ProductType,
  priceKobo: number,
  compareAtKobo: number | null,
  featured: boolean,
];

const seeds: Seed[] = [
  ['Ankara Print Pattern Pack (40 designs)', 'adaezeprints', 'digital', 450000, null, true],
  ['JAMB Physics Past Questions 2015–2025', 'studysmartabuja', 'ebook', 150000, 250000, false],
  ['Logo design — 3 concepts', 'kolacreates', 'service', 2500000, null, false],
  ['Party Jollof Masterclass', 'jollofacademy', 'course', 750000, 1000000, true],
  ['Amapiano Beat Pack Vol. 3', 'beatsbytobi', 'digital', 1200000, null, false],
  ['Raw Shea Butter (500g)', 'amakaskincare', 'physical', 650000, null, true],
  ['Adire Textile Mockups', 'adaezeprints', 'digital', 300000, null, false],
  ['WAEC Chemistry Practicals Guide', 'studysmartabuja', 'ebook', 120000, null, false],
  ['Flyer design (24-hour delivery)', 'kolacreates', 'service', 1500000, null, false],
  ['Small Chops for Events (video course)', 'jollofacademy', 'course', 500000, null, false],
  ['Afrobeats Drum Kit', 'beatsbytobi', 'digital', 850050, null, false],
  ['African Black Soap (3 bars)', 'amakaskincare', 'physical', 450000, 550000, false],
  ['Aso-Ebi Colour Palette Guide', 'adaezeprints', 'ebook', 200000, null, false],
  ['Post-UTME Unilag Past Questions', 'studysmartabuja', 'ebook', 180000, null, true],
  ['Brand Starter Kit for Instagram', 'kolacreates', 'digital', 900000, 1200000, false],
  ['Pepper Soup Spice Blend Recipe', 'jollofacademy', 'ebook', 150000, null, false],
  ['Exclusive Beat Licence', 'beatsbytobi', 'service', 5000000, null, false],
  ['Glow Body Oil (100ml)', 'amakaskincare', 'physical', 380000, null, false],
  ['Gele Tying Tutorial Bundle', 'adaezeprints', 'course', 600000, null, false],
  ['NECO Mathematics Solutions', 'studysmartabuja', 'ebook', 100000, null, false],
  ['Business Card Design', 'kolacreates', 'service', 800000, null, false],
  ['Nigerian Soups Cookbook', 'jollofacademy', 'ebook', 250000, null, false],
  ['Street-Pop Vocal Samples', 'beatsbytobi', 'digital', 400000, null, false],
  ['Skincare Routine Consultation', 'amakaskincare', 'service', 1000000, null, false],
  ['Kente-Inspired Wallpaper Set', 'adaezeprints', 'digital', 99900, null, false],
];

function storeName(slug: string) {
  const store = stores.find((s) => s.slug === slug);
  if (!store) throw new Error(`Fixture product references unknown store "${slug}"`);
  return store.name;
}

/** Newest first, like GET /v1/products. */
export const products: ProductSummary[] = seeds.map(
  ([title, storeSlug, type, priceKobo, compareAtKobo, featured], i) => ({
    id: `prd_${String(i + 1).padStart(3, '0')}`,
    title,
    type,
    price: ngn(priceKobo),
    compareAtPrice: compareAtKobo === null ? null : ngn(compareAtKobo),
    imageUrl: i % 5 === 4 ? null : `https://picsum.photos/seed/nexa-prd-${i + 1}/600/600`,
    store: { slug: storeSlug, name: storeName(storeSlug) },
    featured,
  }),
);
