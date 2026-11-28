import {
  isValidProductLink,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_MIN_PRICE_KOBO,
  PRODUCT_TAGS_MAX,
  PRODUCT_TITLE_MAX,
  STORE_BIO_MAX,
  STORE_NAME_MAX,
  STORE_NAME_MIN,
} from '@nexa/api-contract';
import { parseNairaToKobo } from '@nexa/ui';
import { z } from 'zod';

import { normaliseNigerianPhone } from './phone';
import { slugProblem, slugProblemText } from './slug';

/**
 * Client-side validation for instant feedback. The server validates everything again and
 * decides availability (taken / reserved); these schemas only check format.
 */

export const MAX_INTERESTS = 3;
export const BIO_MAX = 160;
export const DISPLAY_NAME_MAX = 50;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'At least 3 characters')
  .max(20, 'At most 20 characters')
  .regex(/^[a-z]/, 'Start with a letter')
  .regex(/^[a-z0-9_]+$/, 'Use only lowercase letters, numbers and _');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name')
  .max(DISPLAY_NAME_MAX, `At most ${DISPLAY_NAME_MAX} characters`);

export const bioSchema = z.string().trim().max(BIO_MAX, `At most ${BIO_MAX} characters`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address'));

export const phoneSchema = z.string().transform((value, ctx) => {
  const result = normaliseNigerianPhone(value);
  if (!result.ok) {
    ctx.addIssue({
      code: 'custom',
      message:
        result.reason === 'empty'
          ? 'Enter your phone number'
          : 'Enter a valid Nigerian mobile number, e.g. 0803 123 4567',
    });
    return z.NEVER;
  }
  return result.e164;
});

export const interestsSchema = z
  .array(z.string())
  .max(MAX_INTERESTS, `Choose up to ${MAX_INTERESTS}`)
  .refine((tags) => new Set(tags).size === tags.length, 'Each interest can only be chosen once');

export const otpCodeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const pinSchema = z.string().regex(/^\d{4}$/, 'Enter 4 digits');

/** Onboarding: name + username */
export const nameUsernameSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
});

/** Profile edit form */
export const profileFormSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  bio: bioSchema,
});

export type NameUsernameForm = z.infer<typeof nameUsernameSchema>;
export type ProfileForm = z.infer<typeof profileFormSchema>;

// ── Stores (F2) ──────────────────────────────────────────────────────────────

export { STORE_BIO_MAX, STORE_NAME_MAX, STORE_NAME_MIN };

export const storeNameSchema = z
  .string()
  .trim()
  .min(STORE_NAME_MIN, 'Enter your store’s name')
  .max(STORE_NAME_MAX, `At most ${STORE_NAME_MAX} characters`);

export const storeBioSchema = z
  .string()
  .trim()
  .max(STORE_BIO_MAX, `Your bio can be up to ${STORE_BIO_MAX} characters`);

export const slugSchema = z.string().superRefine((slug, ctx) => {
  const problem = slugProblem(slug);
  if (problem) ctx.addIssue({ code: 'custom', message: slugProblemText[problem] });
});

export const storeCategorySchema = z.string().min(1, 'Choose a category');

export const storeFormSchema = z.object({
  name: storeNameSchema,
  slug: slugSchema,
  categorySlug: storeCategorySchema,
  bio: storeBioSchema,
});

export type StoreForm = z.infer<typeof storeFormSchema>;

// ── Products (F4) ────────────────────────────────────────────────────────────

export {
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_MIN_PRICE_KOBO,
  PRODUCT_TAGS_MAX,
  PRODUCT_TITLE_MAX,
} from '@nexa/api-contract';

export const productTitleSchema = z
  .string()
  .trim()
  .min(1, 'Add a title')
  .max(PRODUCT_TITLE_MAX, `At most ${PRODUCT_TITLE_MAX} characters`);

export const productDescriptionSchema = z
  .string()
  .trim()
  .max(PRODUCT_DESCRIPTION_MAX, `At most ${PRODUCT_DESCRIPTION_MAX} characters`);

/** The price field: what the seller types in naira, checked and turned into kobo. */
export const priceNairaSchema = z.string().transform((value, ctx) => {
  const kobo = parseNairaToKobo(value);
  if (kobo === null) {
    ctx.addIssue({ code: 'custom', message: 'Enter a price in naira, like 1500 or 1,500.50' });
    return z.NEVER;
  }
  if (kobo < PRODUCT_MIN_PRICE_KOBO) {
    ctx.addIssue({ code: 'custom', message: 'The minimum price is ₦100' });
    return z.NEVER;
  }
  return kobo;
});

export const productTagsSchema = z
  .array(z.string().trim().min(1).max(30))
  .max(PRODUCT_TAGS_MAX, `Up to ${PRODUCT_TAGS_MAX} tags`);

export const productLinkSchema = z
  .string()
  .trim()
  .refine(isValidProductLink, 'Enter a full link starting with https://');

export const productDetailsSchema = z.object({
  title: productTitleSchema,
  description: productDescriptionSchema,
  categorySlug: z.string().min(1, 'Choose a category'),
  tags: productTagsSchema,
  price: priceNairaSchema,
});

export type ProductDetailsInput = z.input<typeof productDetailsSchema>;
