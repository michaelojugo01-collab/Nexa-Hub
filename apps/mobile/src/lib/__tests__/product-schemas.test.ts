import { koboToNairaInput, parseNairaToKobo } from '@nexa/ui';

import {
  priceNairaSchema,
  productDescriptionSchema,
  productDetailsSchema,
  productLinkSchema,
  productTagsSchema,
  productTitleSchema,
} from '../schemas';

describe('naira → kobo (string maths, no floating point)', () => {
  it.each([
    ['1500.50', 150050],
    ['₦1,500.50', 150050],
    ['1,500.50', 150050],
    ['₦ 2,000', 200000],
    ['NGN 2000', 200000],
    ['100', 10000],
    ['0.1', 10],
    ['0.29', 29], // 0.29 * 100 = 28.999999999999996 in floating point
    ['1.15', 115], // 1.15 * 100 = 114.99999999999999
    ['4.35', 435],
    ['1234567.89', 123456789],
    ['12.', 1200],
  ])('%j → %i', (input, kobo) => {
    expect(parseNairaToKobo(input)).toBe(kobo);
  });

  it.each(['', 'abc', '1e3', '12.345', '-5', '1,50', '1,5000', '₦', '1.2.3', ' 12 34'])(
    'rejects %j',
    (input) => {
      expect(parseNairaToKobo(input)).toBeNull();
    },
  );

  it('round-trips into the price field', () => {
    expect(koboToNairaInput(150050)).toBe('1500.50');
    expect(koboToNairaInput(200000)).toBe('2000');
    expect(koboToNairaInput(5)).toBe('0.05');
    for (const kobo of [10000, 150050, 99, 123456789]) {
      expect(parseNairaToKobo(koboToNairaInput(kobo))).toBe(kobo);
    }
  });
});

describe('product schemas', () => {
  it('title: required, up to 80 characters (trimmed)', () => {
    expect(productTitleSchema.safeParse('x'.repeat(80)).success).toBe(true);
    expect(productTitleSchema.safeParse(`  ${'x'.repeat(80)}  `).success).toBe(true);
    expect(productTitleSchema.safeParse('x'.repeat(81)).error?.issues[0]?.message).toBe(
      'At most 80 characters',
    );
    expect(productTitleSchema.safeParse('   ').error?.issues[0]?.message).toBe('Add a title');
  });

  it('description: up to 500 characters', () => {
    expect(productDescriptionSchema.safeParse('x'.repeat(500)).success).toBe(true);
    expect(productDescriptionSchema.safeParse('x'.repeat(501)).success).toBe(false);
    expect(productDescriptionSchema.safeParse('').success).toBe(true);
  });

  it('price: naira text becomes kobo, minimum ₦100', () => {
    expect(priceNairaSchema.parse('₦1,500.50')).toBe(150050);
    expect(priceNairaSchema.parse('100')).toBe(10000);
    expect(priceNairaSchema.safeParse('99.99').error?.issues[0]?.message).toBe(
      'The minimum price is ₦100',
    );
    expect(priceNairaSchema.safeParse('1e3').error?.issues[0]?.message).toMatch(
      /Enter a price in naira/,
    );
  });

  it('tags: up to 5; link: https only', () => {
    expect(productTagsSchema.safeParse(['a', 'b', 'c', 'd', 'e']).success).toBe(true);
    expect(productTagsSchema.safeParse(['a', 'b', 'c', 'd', 'e', 'f']).success).toBe(false);
    expect(productLinkSchema.safeParse('https://www.notion.so/abc').success).toBe(true);
    for (const bad of [
      'http://x.com',
      'notion.so/abc',
      'https://',
      'https://localhost',
      'javascript:alert(1)',
    ]) {
      expect(productLinkSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('details: all together, price comes out in kobo', () => {
    const parsed = productDetailsSchema.parse({
      title: 'Ankara Pattern Guide',
      description: 'Patterns.',
      categorySlug: 'fashion',
      tags: ['ankara'],
      price: '1,500.50',
    });
    expect(parsed.price).toBe(150050);
  });
});
