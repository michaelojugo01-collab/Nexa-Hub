import type { UploadKind } from './client';

/**
 * Format rules that mirror the contract (openapi.yaml). Shared by the app, the mock backend
 * and the web. Availability (taken / reserved) is only ever decided by the server.
 */

// ── Store links ("slugs") ───────────────────────────────────────────────────

export const SLUG_MIN = 3;
export const SLUG_MAX = 30;

const SLUG_PATTERN = /^(?!.*--)[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export type SlugProblem = 'empty' | 'too-short' | 'too-long' | 'characters' | 'hyphens';

/** Why a slug is not a valid format, or null if it is. */
export function slugProblem(slug: string): SlugProblem | null {
  if (slug.length === 0) return 'empty';
  if (/[^a-z0-9-]/.test(slug)) return 'characters';
  if (slug.length < SLUG_MIN) return 'too-short';
  if (slug.length > SLUG_MAX) return 'too-long';
  if (!SLUG_PATTERN.test(slug)) return 'hyphens';
  return null;
}

export function isValidSlug(slug: string) {
  return slugProblem(slug) === null;
}

// ── Stores ──────────────────────────────────────────────────────────────────

export const STORE_BIO_MAX = 150;
export const STORE_NAME_MIN = 2;
export const STORE_NAME_MAX = 40;

// ── Store images ────────────────────────────────────────────────────────────

/** PROPOSED (docs/decisions.md, F2): the spec asks for limits but gives no numbers. */
export const uploadLimits: Record<UploadKind, { maxBytes: number; label: string }> = {
  avatar: { maxBytes: 5 * 1024 * 1024, label: '5 MB' },
  banner: { maxBytes: 10 * 1024 * 1024, label: '10 MB' },
};

export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof allowedImageTypes)[number];

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (allowedImageTypes as readonly string[]).includes(type);
}

// ── Products (F4) ───────────────────────────────────────────────────────────

export const PRODUCT_TITLE_MAX = 80;
export const PRODUCT_DESCRIPTION_MAX = 500;
/** ₦100 minimum price, in kobo. */
export const PRODUCT_MIN_PRICE_KOBO = 10_000;
export const PRODUCT_TAGS_MAX = 5;
export const PRODUCT_PREVIEW_PAGES_MAX = 5;
/** Cover images are 4:3. */
export const PRODUCT_COVER_ASPECT = 4 / 3;
/** Bytes per multipart part (S3's minimum is 5 MB except the last part). */
export const UPLOAD_PART_SIZE = 5 * 1024 * 1024;

/** A link buyers get after paying: https only, with a real host. */
export function isValidProductLink(link: string) {
  if (!/^https:\/\/[^\s/$.?#][^\s]*$/i.test(link.trim())) return false;
  const host = /^https:\/\/([^/?#:]+)/i.exec(link.trim())?.[1] ?? '';
  return host.includes('.') && !host.endsWith('.');
}
