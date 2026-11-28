import type { UploadKind } from '@nexa/api-contract';

/**
 * Store image limits. PROPOSED (docs/decisions.md, F2): the spec asks for size and type
 * validation but gives no numbers. The server enforces them; the app checks first so a
 * seller on a slow network doesn't wait for an upload that will be refused.
 */
export const uploadLimits: Record<UploadKind, { maxBytes: number; label: string }> = {
  avatar: { maxBytes: 5 * 1024 * 1024, label: '5 MB' },
  banner: { maxBytes: 10 * 1024 * 1024, label: '10 MB' },
};

export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof allowedImageTypes)[number];

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (allowedImageTypes as readonly string[]).includes(type);
}
