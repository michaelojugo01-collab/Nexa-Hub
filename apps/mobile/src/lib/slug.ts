/**
 * Store links ("slugs"). The format rules live in @nexa/api-contract (shared with the mocks
 * and the web); this file adds the app's messages and the suggestion from a store name.
 */

import { SLUG_MAX, SLUG_MIN, type SlugProblem } from '@nexa/api-contract';

export { isValidSlug, SLUG_MAX, SLUG_MIN, slugProblem, type SlugProblem } from '@nexa/api-contract';

export const slugProblemText: Record<SlugProblem, string> = {
  empty: 'Choose a link for your store.',
  'too-short': `Use at least ${SLUG_MIN} characters.`,
  'too-long': `Use ${SLUG_MAX} characters or fewer.`,
  characters: 'Use only lowercase letters, numbers and hyphens.',
  hyphens: 'Start and end with a letter or number, and don’t use two hyphens in a row.',
};

/** Combining marks left after NFD (explicit ranges: no Unicode property escapes needed). */
const COMBINING_MARKS = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;

/** Letters NFD doesn't split into base + accent (Hausa hooked letters and a few others). */
const SPECIAL_LETTERS: Record<string, string> = {
  ɓ: 'b',
  ɗ: 'd',
  ƙ: 'k',
  ƴ: 'y',
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ł: 'l',
  ı: 'i',
};

/**
 * Suggests a slug from a store name: "Ọlá's Ankara & Àdìrẹ 🔥" → "olas-ankara-and-adire".
 * Accents and Yoruba/Igbo under-dots are dropped, emoji and punctuation become hyphens,
 * and the result is cut to 30 characters at a word boundary when possible.
 * Returns "" when nothing usable is left (e.g. a name made only of emoji).
 */
export function suggestSlug(name: string): string {
  let s = name
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '') // accents and under-dots
    .replace(/[ɓɗƙƴßæœøđłı]/g, (ch) => SPECIAL_LETTERS[ch] ?? '')
    .replace(/['’‘`]/g, '') // "Ola's" → "olas", not "ola-s"
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (s.length > SLUG_MAX) {
    const cut = s.slice(0, SLUG_MAX + 1);
    const lastHyphen = cut.lastIndexOf('-');
    s = (lastHyphen >= SLUG_MIN ? cut.slice(0, lastHyphen) : s.slice(0, SLUG_MAX)).replace(
      /-+$/,
      '',
    );
  }
  if (s.length > 0 && s.length < SLUG_MIN) s = `${s}-store`;
  return s;
}

/**
 * Cleans what the seller types into the slug field as they type: lowercases, turns spaces
 * into hyphens and drops other characters, but keeps a trailing hyphen so typing
 * "bisi-" → "bisi-bakes" works.
 */
export function normalizeSlugInput(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX);
}
