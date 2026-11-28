import type {
  AssetKind,
  AssetStatus,
  ContentMode,
  ProductState,
  ProductSummary,
  ProductVisibility,
} from '@nexa/api-contract';

import { findProductType } from './product-types';
import { slugify } from './slugify';
import { stores } from './stores';

/**
 * Product fixtures for F4: every type (A1–A12, I4) live at least once, plus drafts, an asset
 * still processing, a rejected asset, a listing in review, an unlisted product and an
 * unpublished product a buyer already owns. Records here are the mock server's internal
 * shape; public responses are built from them and never include file URLs or links.
 */

const ngn = (amountKobo: number) => ({ amountKobo, currency: 'NGN' as const });

export type AssetRecord = {
  id: string;
  kind: AssetKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  /** When the upload finished; status is derived from time since then (scan → process). */
  completedAt: string | null;
  /** Fixed outcome for fixtures; live uploads decide at completion. */
  status: AssetStatus | null;
  rejectionReason: string | null;
  pageCount: number | null;
  durationSeconds: number | null;
  /** Mock storage: where the "file" is (never sent to buyers). */
  storageUri: string;
};

export type ProductRecord = {
  id: string;
  slug: string;
  storeSlug: string;
  typeCode: string;
  contentMode: ContentMode;
  state: ProductState;
  visibility: ProductVisibility;
  title: string;
  description: string;
  categorySlug: string | null;
  tags: string[];
  price: { amountKobo: number; currency: 'NGN' } | null;
  compareAtPrice: { amountKobo: number; currency: 'NGN' } | null;
  featured: boolean;
  coverUrl: string | null;
  coverAssetId: string | null;
  mainAssetId: string | null;
  previewAssetId: string | null;
  /** Replaced main file, kept 30 days for past buyers (docs/decisions.md, F4). */
  previousMainAssetId: string | null;
  linkUrl: string | null;
  previewPages: number;
  previewClipUrl: string | null;
  rightsDeclaredAt: string | null;
  salesCount: number;
  assets: AssetRecord[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Seed = {
  title: string;
  store: string;
  type: string;
  price: number | null;
  was?: number;
  featured?: boolean;
  description: string;
  tags?: string[];
  state?: ProductState;
  visibility?: ProductVisibility;
  mode?: ContentMode;
  sales?: number;
  link?: string;
  /** Main asset outcome for drafts (default ready). */
  asset?: AssetStatus | 'none';
  noCover?: boolean;
};

/** Newest first. */
const seeds: Seed[] = [
  {
    title: 'Ankara Print Pattern Pack (40 designs)',
    store: 'adaezeprints',
    type: 'A3',
    price: 450000,
    featured: true,
    sales: 312,
    tags: ['ankara', 'fashion'],
    description:
      '40 hand-drawn Ankara patterns as print-ready PNG and SVG files. Use them for fabric, packaging or social posts.',
  },
  {
    title: 'JAMB Physics Study Guide: Topics and Formulas',
    store: 'studysmartabuja',
    type: 'A10',
    price: 150000,
    was: 250000,
    sales: 1204,
    tags: ['jamb', 'study-guide'],
    description:
      'Every JAMB Physics topic explained simply, with the formulas you need and worked examples written by our tutors. PDF, 210 pages.',
  },
  {
    title: 'Logo Template Pack (editable)',
    store: 'kolacreates',
    type: 'A3',
    price: 900000,
    sales: 48,
    tags: ['logo', 'branding'],
    description:
      '30 editable logo templates for small businesses, with fonts and colour guides. AI, SVG and PNG.',
  },
  {
    title: 'Party Jollof Masterclass',
    store: 'jollofacademy',
    type: 'A6',
    price: 750000,
    was: 1000000,
    featured: true,
    sales: 860,
    tags: ['cooking', 'jollof'],
    description:
      'Cook smoky party jollof for 50 guests. 9 short videos: the base, the rice, the bottom-pot and timing.',
  },
  {
    title: 'Amapiano Beat Pack Vol. 3',
    store: 'beatsbytobi',
    type: 'A4',
    price: 1200000,
    sales: 95,
    tags: ['amapiano', 'beats'],
    description:
      '12 amapiano instrumentals with stems. Non-exclusive licence for streaming and live shows.',
  },
  {
    title: 'Shea Butter Skincare Guide',
    store: 'amakaskincare',
    type: 'A1',
    price: 250000,
    featured: true,
    sales: 410,
    tags: ['skincare'],
    description:
      'How to choose, store and use raw shea butter for skin and hair, with 12 simple routines.',
  },
  {
    title: 'Adire Textile Mockups',
    store: 'adaezeprints',
    type: 'A3',
    price: 300000,
    sales: 77,
    tags: ['adire', 'fashion'],
    description:
      'Photo mockups for adire and tie-dye designs: wrappers, tote bags and shirts. Editable layers.',
  },
  {
    title: 'WAEC Chemistry Practicals Guide',
    store: 'studysmartabuja',
    type: 'A10',
    price: 120000,
    sales: 530,
    tags: ['waec', 'study-guide'],
    description:
      'Step-by-step guide to WAEC Chemistry practicals: titration, salt analysis and how marks are given.',
  },
  {
    title: 'Event Flyer Templates (Canva)',
    store: 'kolacreates',
    type: 'A2',
    mode: 'LINK',
    link: 'https://www.canva.com/design/DAF-mock-event-flyers/view',
    price: 500000,
    sales: 61,
    tags: ['canva', 'branding'],
    description:
      '25 editable Canva flyers for events, birthdays and church programmes. You get the Canva link after paying.',
  },
  {
    title: 'Small Chops for Events (video course)',
    store: 'jollofacademy',
    type: 'A6',
    price: 500000,
    sales: 220,
    tags: ['cooking'],
    description:
      'Puff-puff, samosa, spring rolls and peppered gizzard for events, with costing per 100 guests.',
  },
  {
    title: 'Afrobeats Drum Kit',
    store: 'beatsbytobi',
    type: 'A4',
    price: 850050,
    sales: 133,
    tags: ['afrobeats', 'samples'],
    description:
      '250 one-shots and loops: shakers, talking drum, log drums and claps. WAV, 24-bit.',
  },
  {
    title: 'Black Soap Making Guide',
    store: 'amakaskincare',
    type: 'A1',
    price: 200000,
    was: 300000,
    sales: 150,
    tags: ['skincare'],
    description:
      'Make African black soap at home with shea and palm kernel oil, step by step with photos.',
  },
  {
    title: 'Aso-Ebi Colour Palette Guide',
    store: 'adaezeprints',
    type: 'A1',
    price: 200000,
    sales: 54,
    tags: ['aso-ebi', 'fashion'],
    description:
      '30 aso-ebi colour palettes with fabric and gele pairings, for planners and families.',
  },
  {
    title: 'Post-UTME Unilag Study Plan',
    store: 'studysmartabuja',
    type: 'A10',
    price: 180000,
    featured: true,
    sales: 690,
    tags: ['post-utme', 'study-guide'],
    description:
      'A 6-week UNILAG post-UTME study plan with topic summaries and practice questions written by our tutors.',
  },
  {
    title: 'Brand Starter Kit for Instagram',
    store: 'kolacreates',
    type: 'A2',
    price: 900000,
    was: 1200000,
    sales: 39,
    tags: ['branding', 'small-business'],
    description:
      '30 editable Instagram templates, highlight covers and a colour guide for small businesses.',
  },
  {
    title: 'Pepper Soup Spice Blend Recipe',
    store: 'jollofacademy',
    type: 'A1',
    price: 150000,
    sales: 300,
    tags: ['cooking'],
    description:
      'The house pepper soup blend, measured for home and for catering, with goat and catfish recipes.',
  },
  {
    title: 'Afro Drill Beat with Stems',
    store: 'beatsbytobi',
    type: 'A4',
    price: 2500000,
    sales: 6,
    tags: ['beats'],
    description:
      'One afro drill beat with stems and a non-exclusive licence for streaming and shows.',
  },
  {
    title: 'DIY Body Oil Recipes',
    store: 'amakaskincare',
    type: 'A1',
    price: 180000,
    sales: 88,
    tags: ['skincare'],
    description:
      'Eight body oil recipes with carrot seed, sweet almond and coconut oil, and where to buy them.',
  },
  {
    title: 'Gele Tying Tutorial Bundle',
    store: 'adaezeprints',
    type: 'A6',
    price: 600000,
    sales: 140,
    tags: ['aso-ebi'],
    description: 'Six gele styles in short videos, from the classic fan to the 2026 owambe wrap.',
  },
  {
    title: 'NECO Mathematics Revision Notes',
    store: 'studysmartabuja',
    type: 'A10',
    price: 100000,
    sales: 410,
    tags: ['neco', 'study-guide'],
    description:
      'Clear revision notes for every NECO Mathematics topic, with practice questions and answers we wrote.',
  },
  {
    title: 'Business Card Templates',
    store: 'kolacreates',
    type: 'A2',
    price: 400000,
    sales: 27,
    tags: ['branding'],
    description: 'Twelve double-sided business card templates with print-ready files.',
  },
  {
    title: 'Nigerian Soups Cookbook',
    store: 'jollofacademy',
    type: 'A1',
    price: 250000,
    sales: 515,
    tags: ['cooking'],
    description:
      'Egusi, ogbono, banga, afang and 16 more soups, with shopping lists for small and big pots.',
  },
  {
    title: 'Street-Pop Vocal Samples',
    store: 'beatsbytobi',
    type: 'A4',
    price: 400000,
    sales: 72,
    tags: ['samples'],
    description:
      'Royalty-free street-pop ad-libs, chants and hooks, tempo-labelled and ready to drop in.',
  },
  {
    title: 'Skincare Routine Planner',
    store: 'amakaskincare',
    type: 'A11',
    price: 120000,
    sales: 64,
    tags: ['skincare', 'planner', 'printable'],
    description: 'A printable 12-week skincare routine planner with a product tracker.',
  },
  {
    title: 'Kente-Inspired Wallpaper Set',
    store: 'adaezeprints',
    type: 'A5',
    price: 99900,
    sales: 205,
    tags: ['fashion'],
    description:
      '12 phone and desktop wallpapers inspired by kente weaves. Original illustrations.',
  },
  {
    title: 'Small Business Bookkeeping Tracker',
    store: 'kolacreates',
    type: 'A7',
    price: 350000,
    sales: 118,
    tags: ['excel', 'small-business', 'budget'],
    description:
      'Excel tracker for sales, expenses and profit, with monthly charts. Works in Google Sheets.',
  },
  {
    title: 'Portfolio Website Theme (Next.js)',
    store: 'kolacreates',
    type: 'A8',
    price: 1500000,
    sales: 12,
    tags: ['website', 'react'],
    description:
      'A fast portfolio theme for designers and developers, ready to deploy. Source code as a ZIP.',
  },
  {
    title: 'ChatGPT Prompts for Small Business',
    store: 'kolacreates',
    type: 'A9',
    price: 300000,
    sales: 240,
    tags: ['chatgpt', 'ai', 'small-business'],
    description:
      '150 tested prompts for captions, customer replies, product descriptions and pricing.',
  },
  {
    title: 'JAMB Prep Hub on Notion',
    store: 'studysmartabuja',
    type: 'A12',
    link: 'https://www.notion.so/mock-jamb-prep-hub',
    price: 200000,
    sales: 330,
    tags: ['jamb', 'notion'],
    description:
      'Our Notion hub with weekly study schedules, topic checklists and video links. You get the link after paying.',
  },
  {
    title: 'Fashion Business OS (Notion)',
    store: 'adaezeprints',
    type: 'I4',
    link: 'https://www.notion.so/mock-fashion-business-os',
    price: 800000,
    sales: 45,
    tags: ['notion', 'small-business'],
    description:
      'A Notion system for orders, fabric stock, clients and deliveries. Duplicate it into your workspace.',
  },
  {
    title: 'Kids Alphabet Worksheets',
    store: 'studysmartabuja',
    type: 'A11',
    price: 100000,
    sales: 95,
    tags: ['printable'],
    description:
      '52 printable alphabet worksheets for nursery and primary 1, in colour and black and white.',
  },
  // A live product in the private store: never listed, shown or put in the sitemap.
  {
    title: 'Owambe Glow Lightroom Presets',
    store: 'lensbyemeka',
    type: 'A3',
    price: 350000,
    sales: 3,
    tags: ['lightroom', 'presets'],
    description: '10 Lightroom presets for warm, glowing party photos. Mobile and desktop.',
  },
  // Unlisted: opens by link, never listed.
  {
    title: 'Bridal Party Pattern Set (private clients)',
    store: 'adaezeprints',
    type: 'A3',
    price: 1500000,
    visibility: 'unlisted',
    sales: 9,
    tags: ['ankara'],
    description: 'Custom bridal party patterns for my private clients. Shared by link only.',
  },
  // Unpublished: off sale, but Chidi bought it before (see entitlements).
  {
    title: 'Ankara Pattern Pack 2025 Edition',
    store: 'adaezeprints',
    type: 'A3',
    price: 350000,
    state: 'unpublished',
    sales: 41,
    tags: ['ankara'],
    description: 'Last year’s 30-pattern collection, replaced by the 2026 pack.',
  },
  // In review: flagged keywords.
  {
    title: 'WAEC 2026 Leaked Questions and Answers',
    store: 'studysmartabuja',
    type: 'A10',
    price: 500000,
    state: 'pending_review',
    sales: 0,
    tags: ['waec'],
    description: 'Expo questions for WAEC 2026.',
  },
  // Drafts
  {
    title: 'Asoke Pattern Pack (coming soon)',
    store: 'adaezeprints',
    type: 'A3',
    price: 500000,
    state: 'draft',
    sales: 0,
    asset: 'processing',
    tags: ['fashion'],
    description: 'Twenty asoke patterns. Still uploading the final files.',
  },
  {
    title: 'Ankara Mega Bundle',
    store: 'adaezeprints',
    type: 'A3',
    price: 2000000,
    state: 'draft',
    sales: 0,
    asset: 'rejected',
    description: 'Everything in one download.',
  },
  {
    title: 'Catering Business Masterclass',
    store: 'jollofacademy',
    type: 'A6',
    price: null,
    state: 'draft',
    sales: 0,
    asset: 'none',
    noCover: true,
    description: '',
  },
];

function storeOf(slug: string) {
  const store = stores.find((s) => s.slug === slug);
  if (!store) throw new Error(`Fixture product references unknown store "${slug}"`);
  return store;
}

const DAY = 86_400_000;
const NEWEST = Date.parse('2026-11-27T09:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

const sampleFile: Record<ContentMode, { name: string; type: string; size: number }> = {
  DOWNLOAD_LIMITED: { name: 'product.pdf', type: 'application/pdf', size: 14 * 1024 * 1024 },
  STREAM_ONLY: { name: 'lesson.mp4', type: 'video/mp4', size: 620 * 1024 * 1024 },
  LINK: { name: '', type: '', size: 0 },
};

/** Public sample media for preview clips in mock mode. */
export const SAMPLE_VIDEO_CLIP =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
export const SAMPLE_AUDIO_CLIP = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

function mainFileFor(typeCode: string, mode: ContentMode) {
  const type = findProductType(typeCode)!;
  if (mode === 'LINK') return null;
  if (type.preview === 'audio_clip')
    return { name: 'pack.zip', type: 'application/zip', size: 380 * 1024 * 1024 };
  if (type.files?.extensions.includes('pdf')) return sampleFile.DOWNLOAD_LIMITED;
  if (mode === 'STREAM_ONLY') return sampleFile.STREAM_ONLY;
  if (type.files?.extensions.includes('xlsx'))
    return {
      name: 'tracker.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 2 * 1024 * 1024,
    };
  return { name: 'files.zip', type: 'application/zip', size: 95 * 1024 * 1024 };
}

function toRecord(seed: Seed, i: number): ProductRecord {
  const store = storeOf(seed.store);
  const type = findProductType(seed.type);
  if (!type) throw new Error(`Unknown product type ${seed.type}`);
  const mode = seed.mode ?? type.modes[0]!;
  const n = i + 1;
  const id = `prd_${String(n).padStart(3, '0')}`;
  const created = NEWEST - i * DAY;
  const state = seed.state ?? 'live';
  const coverUrl = seed.noCover
    ? null
    : n % 5 === 0
      ? `https://picsum.photos/seed/nexa-prd-${n}-cover/800/600`
      : `https://picsum.photos/seed/nexa-prd-${n}/800/600`;

  const assets: AssetRecord[] = [];
  let mainAssetId: string | null = null;
  const file = mainFileFor(seed.type, mode);
  if (file && seed.asset !== 'none') {
    mainAssetId = `ast_${n}_main`;
    const status = seed.asset ?? 'ready';
    assets.push({
      id: mainAssetId,
      kind: 'main',
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      createdAt: iso(created),
      completedAt: iso(created),
      status,
      rejectionReason: status === 'rejected' ? 'The file failed the virus scan.' : null,
      pageCount: status === 'ready' && file.type === 'application/pdf' ? 40 + (n % 7) * 30 : null,
      durationSeconds:
        status === 'ready' && mode === 'STREAM_ONLY'
          ? 1800 + n * 60
          : type.preview === 'audio_clip' && status === 'ready'
            ? 2400
            : null,
      storageUri: `mock://storage/${id}/${file.name}`,
    });
  }
  let coverAssetId: string | null = null;
  if (coverUrl) {
    coverAssetId = `ast_${n}_cover`;
    assets.push({
      id: coverAssetId,
      kind: 'cover',
      fileName: 'cover.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 180_000,
      createdAt: iso(created),
      completedAt: iso(created),
      status: 'ready',
      rejectionReason: null,
      pageCount: null,
      durationSeconds: null,
      storageUri: coverUrl,
    });
  }
  const live = state === 'live' || state === 'unpublished' || state === 'pending_review';

  return {
    id,
    slug: slugify(seed.title),
    storeSlug: store.slug,
    typeCode: seed.type,
    contentMode: mode,
    state,
    visibility: seed.visibility ?? 'public',
    title: seed.title,
    description: seed.description,
    categorySlug: type.defaultCategorySlug,
    tags: seed.tags ?? [],
    price: seed.price === null ? null : ngn(seed.price),
    compareAtPrice: seed.was ? ngn(seed.was) : null,
    featured: seed.featured ?? false,
    coverUrl,
    coverAssetId,
    mainAssetId,
    previewAssetId: null,
    previousMainAssetId: null,
    linkUrl: mode === 'LINK' ? (seed.link ?? 'https://www.notion.so/mock-link') : null,
    previewPages: type.preview === 'pages' && mode !== 'LINK' ? 3 : 0,
    previewClipUrl:
      type.preview === 'video_clip'
        ? SAMPLE_VIDEO_CLIP
        : type.preview === 'audio_clip'
          ? SAMPLE_AUDIO_CLIP
          : null,
    rightsDeclaredAt: type.rightsRequired && live ? iso(created) : null,
    salesCount: seed.sales ?? 0,
    assets,
    publishedAt: live ? iso(created) : null,
    createdAt: iso(created - DAY),
    updatedAt: iso(created + 3_600_000),
  };
}

/** Fresh copies each call, so the mock server can change its own. */
export function productRecordsFresh(): ProductRecord[] {
  return seeds.map(toRecord);
}

/** The fixture records as first loaded (read-only use: tests and static data). */
export const productRecords: ProductRecord[] = productRecordsFresh();

export function toProductSummary(record: ProductRecord): ProductSummary {
  const store = storeOf(record.storeSlug);
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    typeCode: record.typeCode,
    typeName: findProductType(record.typeCode)?.name ?? record.typeCode,
    contentMode: record.contentMode,
    price: record.price ?? ngn(0),
    compareAtPrice: record.compareAtPrice,
    imageUrl: record.coverUrl,
    store: { slug: store.slug, name: store.name },
    featured: record.featured,
  };
}

/** Listed in public: live, public, in a public store. */
export function isListed(record: ProductRecord) {
  return (
    record.state === 'live' &&
    record.visibility === 'public' &&
    storeOf(record.storeSlug).visibility === 'public'
  );
}

/** Live public products of public stores, newest first (fixture snapshot). */
export const products: ProductSummary[] = productRecords.filter(isListed).map(toProductSummary);

/** Who bought what (F5 builds the library). Chidi owns the unpublished 2025 pack. */
export const entitlementFixtures = [
  { userId: 'usr_chidi', productId: 'prd_034', purchasedAt: '2026-03-14T10:00:00Z' },
  { userId: 'usr_chidi', productId: 'prd_002', purchasedAt: '2026-10-01T10:00:00Z' },
];
