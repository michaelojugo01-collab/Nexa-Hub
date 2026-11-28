import type { Product, ProductSummary, PublicProfile, Store } from '@nexa/api-contract';
import { site, siteUrl } from '@nexa/config/site';
import { formatKobo } from '@nexa/ui';
import type { Metadata } from 'next';

/**
 * Per-page metadata and JSON-LD, as pure functions so they can be tested.
 * Link previews (WhatsApp, Instagram, TikTok, X) read Open Graph; WhatsApp shows the
 * og:title, og:description and og:image, so the price goes into the title and description.
 */

export const DEFAULT_OG_IMAGE = `${siteUrl}/og-default.png`;

export function canonicalUrl(path: string) {
  return `${siteUrl}${path === '/' ? '' : path}`;
}

/** Kobo → schema.org price string in naira, with no floating point: 450050 → "4500.50". */
export function nairaPrice(amountKobo: number) {
  if (!Number.isSafeInteger(amountKobo) || amountKobo < 0) throw new TypeError('Bad kobo amount');
  return `${Math.floor(amountKobo / 100)}.${String(amountKobo % 100).padStart(2, '0')}`;
}

function clip(text: string, max = 200) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Smart App Banner on iOS Safari; app-argument is the page link the app maps. */
function itunes(path: string): Metadata['itunes'] {
  return { appId: site.ios.appStoreId, appArgument: canonicalUrl(path) };
}

function shared(
  path: string,
  title: string,
  description: string,
  image: { url: string; width?: number; height?: number; alt: string },
  ogType: 'website' | 'profile' = 'website',
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(path) },
    openGraph: {
      type: ogType,
      url: canonicalUrl(path),
      siteName: site.name,
      title,
      description,
      locale: 'en_NG',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
    itunes: itunes(path),
  };
}

export function storePath(store: Pick<Store, 'slug'>) {
  return `/${store.slug}`;
}

export function productPath(product: Pick<ProductSummary, 'slug' | 'store'>) {
  return `/${product.store.slug}/${product.slug}`;
}

export function profilePath(profile: Pick<PublicProfile, 'username'>) {
  return `/@${profile.username}`;
}

export function storeMetadata(store: Store): Metadata {
  const title = `${store.name} on ${site.name}`;
  const parts = [
    store.bio,
    store.category?.name,
    store.location,
    `${store.followerCount.toLocaleString('en-NG')} followers`,
  ].filter(Boolean);
  const image = store.banner?.large ?? store.avatar?.large ?? store.coverUrl ?? store.avatarUrl;
  return shared(
    storePath(store),
    title,
    clip(parts.join(' · ')),
    image
      ? { url: image, alt: store.name }
      : { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: site.name },
  );
}

export function productMetadata(product: Product): Metadata {
  const meta = productMetadataBase(product);
  // Unlisted products open by link but are never indexed (F4).
  return product.visibility === 'unlisted'
    ? { ...meta, robots: { index: false, follow: false } }
    : meta;
}

function productMetadataBase(product: Product): Metadata {
  const price = formatKobo(product.price.amountKobo);
  const title = `${product.title} – ${price}`;
  const description = clip(
    `${price} · by ${product.storeInfo.name} on ${site.name}.${product.description ? ` ${product.description}` : ''}`,
  );
  const image = product.images[0] ?? product.imageUrl;
  return shared(
    productPath(product),
    title,
    description,
    image
      ? { url: image, alt: product.title }
      : { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: site.name },
  );
}

/** Extra Open Graph product tags (rendered as <meta property> in the page). */
export function productPriceTags(product: Product) {
  return [
    { property: 'product:price:amount', content: nairaPrice(product.price.amountKobo) },
    { property: 'product:price:currency', content: product.price.currency },
    { property: 'og:price:amount', content: nairaPrice(product.price.amountKobo) },
    { property: 'og:price:currency', content: product.price.currency },
  ];
}

export function profileMetadata(profile: PublicProfile): Metadata {
  const name = profile.displayName ?? `@${profile.username}`;
  const title = `${name} (@${profile.username}) on ${site.name}`;
  const description = clip(
    [profile.bio, profile.store ? `Shop: ${profile.store.name}` : null]
      .filter(Boolean)
      .join(' · ') || `${name} is on ${site.name}.`,
  );
  return shared(
    profilePath(profile),
    title,
    description,
    profile.avatarUrl
      ? { url: profile.avatarUrl, alt: name }
      : { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: site.name },
    'profile',
  );
}

// ── JSON-LD (schema.org) ─────────────────────────────────────────────────────

function offer(product: ProductSummary, sellerName: string) {
  return {
    '@type': 'Offer',
    url: canonicalUrl(productPath(product)),
    price: nairaPrice(product.price.amountKobo),
    priceCurrency: product.price.currency,
    availability: 'https://schema.org/InStock',
    seller: { '@type': 'Organization', name: sellerName },
  };
}

export function productJsonLd(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    image: product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [],
    sku: product.id,
    url: canonicalUrl(productPath(product)),
    brand: { '@type': 'Brand', name: product.storeInfo.name },
    category: product.category?.name ?? product.typeName,
    offers: offer(product, product.storeInfo.name),
  };
}

export function storeJsonLd(store: Store, products: ProductSummary[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: store.name,
    url: canonicalUrl(storePath(store)),
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: product.title,
        image: product.imageUrl ?? undefined,
        url: canonicalUrl(productPath(product)),
        offers: offer(product, store.name),
      },
    })),
  };
}

export function profileJsonLd(profile: PublicProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: canonicalUrl(profilePath(profile)),
    dateCreated: profile.createdAt,
    mainEntity: {
      '@type': 'Person',
      name: profile.displayName ?? profile.username,
      alternateName: `@${profile.username}`,
      description: profile.bio ?? undefined,
      image: profile.avatarUrl ?? undefined,
    },
  };
}

/** Safe to put inside <script type="application/ld+json"> (no "</script>" breakouts). */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
