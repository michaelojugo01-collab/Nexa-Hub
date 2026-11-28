import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductPage, { generateMetadata as productMeta } from '../[store]/[product]/page';
import { generateMetadata as storeMeta } from '../[store]/page';
import { generateMetadata as profileMeta } from '../profile/[username]/page';
import sitemap from '../sitemap';
import robots from '../robots';

// Hoisted by Vitest above the imports: run the real data layer against the shared mocks,
// without Next's cache.
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));

/** Next's notFound()/permanentRedirect() throw errors with a digest. */
async function digestOf(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { digest?: string }).digest ?? String(error);
  }
}

const p = <T>(value: T) => ({ params: Promise.resolve(value) });

describe('store page', () => {
  it('generates metadata for a public store', async () => {
    const meta = await storeMeta(p({ store: 'adaezeprints' }));
    expect(meta.alternates?.canonical).toBe('https://nexahub.app/adaezeprints');
    expect(meta.openGraph?.title).toBe('Adaeze Prints on Nexa Hub');
  });

  it('permanently redirects an old slug', async () => {
    expect(await digestOf(storeMeta(p({ store: 'adaezestudio' })))).toMatch(
      /^NEXT_REDIRECT;replace;\/adaezeprints;308;/,
    );
  });

  it.each(['lensbyemeka', 'no-such-store', 'Bad Slug', 'ab'])('gives 404 for %s', async (store) => {
    expect(await digestOf(storeMeta(p({ store })))).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

describe('product page', () => {
  it('generates metadata with the price', async () => {
    const meta = await productMeta(p({ store: 'adaezeprints', product: 'adire-textile-mockups' }));
    expect(meta.title).toBe('Adire Textile Mockups – ₦3,000');
  });

  it('redirects a product under an old store slug', async () => {
    expect(
      await digestOf(productMeta(p({ store: 'adaezestudio', product: 'adire-textile-mockups' }))),
    ).toMatch(/^NEXT_REDIRECT;replace;\/adaezeprints\/adire-textile-mockups;308;/);
  });

  it('opens an unlisted product by link, with noindex', async () => {
    const meta = await productMeta(
      p({ store: 'adaezeprints', product: 'bridal-party-pattern-set-private-clients' }),
    );
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it('public products are indexable', async () => {
    const meta = await productMeta(p({ store: 'adaezeprints', product: 'adire-textile-mockups' }));
    expect(meta.robots).toBeUndefined();
  });

  it.each([
    ['adaezeprints', 'ankara-pattern-pack-2025-edition'], // unpublished (410 from the API)
    ['studysmartabuja', 'waec-2026-leaked-questions-and-answers'], // in review
    ['adaezeprints', 'asoke-pattern-pack-coming-soon'], // draft
    ['lensbyemeka', 'owambe-glow-lightroom-presets'], // private store
    ['adaezeprints', 'no-such-thing'],
  ])('gives 404 for %s/%s', async (store, product) => {
    expect(await digestOf(ProductPage(p({ store, product })))).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

describe('profile page', () => {
  it('generates metadata with the /@username canonical', async () => {
    const meta = await profileMeta(p({ username: 'tunde' }));
    expect(meta.alternates?.canonical).toBe('https://nexahub.app/@tunde');
  });

  it('gives 404 for unknown users', async () => {
    expect(await digestOf(profileMeta(p({ username: 'nobody_here' })))).toBe(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
  });
});

describe('sitemap.xml and robots.txt', () => {
  let urls: string[];
  beforeEach(async () => {
    urls = (await sitemap()).map((e) => e.url);
  });

  it('lists public stores and live products', () => {
    expect(urls).toContain('https://nexahub.app');
    expect(urls).toContain('https://nexahub.app/adaezeprints');
    expect(urls).toContain('https://nexahub.app/adaezeprints/ankara-print-pattern-pack-40-designs');
  });

  it('never lists private stores, their products, drafts or old slugs', () => {
    expect(urls.some((u) => u.includes('/lensbyemeka'))).toBe(false);
    expect(urls.some((u) => u.includes('asoke-pattern-pack'))).toBe(false);
    expect(urls.some((u) => u.includes('catering-business-masterclass'))).toBe(false);
    expect(urls.some((u) => u.includes('/adaezestudio'))).toBe(false);
    expect(urls.some((u) => u.includes('bridal-party-pattern-set'))).toBe(false); // unlisted
    expect(urls.some((u) => u.includes('ankara-pattern-pack-2025-edition'))).toBe(false); // unpublished
    expect(urls.some((u) => u.includes('waec-2026-leaked'))).toBe(false); // in review
  });

  it('robots.txt points at the sitemap', () => {
    expect(robots()).toMatchObject({ sitemap: 'https://nexahub.app/sitemap.xml' });
  });
});
