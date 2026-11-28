import { productRecords, stores } from '@nexa/mocks';
import type { Product, PublicProfile } from '@nexa/api-contract';
import { describe, expect, it } from 'vitest';

import {
  canonicalUrl,
  DEFAULT_OG_IMAGE,
  jsonLdString,
  nairaPrice,
  productJsonLd,
  productMetadata,
  productPriceTags,
  profileJsonLd,
  profileMetadata,
  storeJsonLd,
  storeMetadata,
} from '../seo';

const adaeze = stores.find((s) => s.slug === 'adaezeprints')!;
const kola = stores.find((s) => s.slug === 'kolacreates')!;

function product(slug: string): Product {
  const { status: _s, updatedAt: _u, ...p } = productRecords.find((r) => r.slug === slug)!;
  return p;
}

const profile: PublicProfile = {
  username: 'adaeze',
  displayName: 'Adaeze Okafor',
  avatarUrl: 'https://picsum.photos/seed/a/240/240',
  bio: 'Textile designer in Yaba.',
  store: {
    id: 'str_adaeze',
    slug: 'adaezeprints',
    name: 'Adaeze Prints',
    avatarUrl: null,
    location: 'Yaba, Lagos',
    verified: true,
    followerCount: 12480,
  },
  createdAt: '2026-10-02T09:15:00Z',
};

describe('naira prices', () => {
  it('converts kobo to a naira string without floating point', () => {
    expect(nairaPrice(450000)).toBe('4500.00');
    expect(nairaPrice(850050)).toBe('8500.50');
    expect(nairaPrice(99900)).toBe('999.00');
    expect(nairaPrice(5)).toBe('0.05');
    expect(() => nairaPrice(10.5)).toThrow();
  });
});

describe('store metadata', () => {
  const meta = storeMetadata(adaeze);

  it('has title, description, canonical and the banner as image', () => {
    expect(meta.title).toBe('Adaeze Prints on Nexa Hub');
    expect(meta.description).toContain('Hand-drawn Ankara patterns');
    expect(meta.description).toContain('12,480 followers');
    expect(meta.alternates?.canonical).toBe('https://nexahub.app/adaezeprints');
    expect(meta.openGraph).toMatchObject({
      url: 'https://nexahub.app/adaezeprints',
      siteName: 'Nexa Hub',
      title: 'Adaeze Prints on Nexa Hub',
      images: [{ url: adaeze.banner!.large }],
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(meta.itunes).toEqual({
      appId: '0000000000',
      appArgument: 'https://nexahub.app/adaezeprints',
    });
  });

  it('falls back to the default share image when the store has none', () => {
    expect(storeMetadata(kola).openGraph?.images).toEqual([
      { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'Nexa Hub' },
    ]);
  });

  it('lists products with Offers in naira', () => {
    const ld = storeJsonLd(adaeze, [product('adire-textile-mockups')]);
    expect(ld).toMatchObject({ '@type': 'ItemList', numberOfItems: 1 });
    expect(ld.itemListElement[0]!.item.offers).toMatchObject({
      price: '3000.00',
      priceCurrency: 'NGN',
    });
  });
});

describe('product metadata', () => {
  const p = product('ankara-print-pattern-pack-40-designs');
  const meta = productMetadata(p);

  it('puts the price in the title and description (WhatsApp shows those)', () => {
    expect(meta.title).toBe('Ankara Print Pattern Pack (40 designs) – ₦4,500');
    expect(meta.description).toMatch(/^₦4,500 · by Adaeze Prints on Nexa Hub\. 40 hand-drawn/);
    expect(meta.openGraph).toMatchObject({
      title: 'Ankara Print Pattern Pack (40 designs) – ₦4,500',
      url: 'https://nexahub.app/adaezeprints/ankara-print-pattern-pack-40-designs',
      images: [{ url: p.images[0], width: 600, height: 600 }],
    });
    expect(meta.alternates?.canonical).toBe(
      canonicalUrl('/adaezeprints/ankara-print-pattern-pack-40-designs'),
    );
  });

  it('adds product price tags', () => {
    expect(productPriceTags(p)).toEqual(
      expect.arrayContaining([
        { property: 'product:price:amount', content: '4500.00' },
        { property: 'product:price:currency', content: 'NGN' },
      ]),
    );
  });

  it('builds JSON-LD Product + Offer', () => {
    const ld = productJsonLd(p);
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Ankara Print Pattern Pack (40 designs)',
      sku: p.id,
      brand: { '@type': 'Brand', name: 'Adaeze Prints' },
      offers: {
        '@type': 'Offer',
        price: '4500.00',
        priceCurrency: 'NGN',
        availability: 'https://schema.org/InStock',
        url: 'https://nexahub.app/adaezeprints/ankara-print-pattern-pack-40-designs',
      },
    });
    expect(ld.image).toEqual(p.images);
  });

  it('uses the sale price, not the old price', () => {
    const sale = product('jamb-physics-past-questions-2015-2025');
    expect(productJsonLd(sale).offers.price).toBe('1500.00');
    expect(productMetadata(sale).title).toContain('₦1,500');
  });
});

describe('profile metadata', () => {
  it('has the name, username, canonical /@username and profile type', () => {
    const meta = profileMetadata(profile);
    expect(meta.title).toBe('Adaeze Okafor (@adaeze) on Nexa Hub');
    expect(meta.description).toBe('Textile designer in Yaba. · Shop: Adaeze Prints');
    expect(meta.alternates?.canonical).toBe('https://nexahub.app/@adaeze');
    expect(meta.openGraph).toMatchObject({ type: 'profile', images: [{ url: profile.avatarUrl }] });
    expect(profileJsonLd(profile)).toMatchObject({
      '@type': 'ProfilePage',
      mainEntity: { '@type': 'Person', alternateName: '@adaeze' },
    });
  });
});

describe('JSON-LD output', () => {
  it('cannot break out of the script tag', () => {
    expect(jsonLdString({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});
