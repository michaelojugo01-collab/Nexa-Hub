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

export const STORE_BIO_MAX = 150;
export const STORE_NAME_MIN = 2;
export const STORE_NAME_MAX = 40;

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
