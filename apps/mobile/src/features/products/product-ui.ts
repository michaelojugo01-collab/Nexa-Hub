import type { AssetStatus, ContentMode, ProductState } from '@nexa/api-contract';

import type { BadgeVariant } from '@/components/Badge';

/**
 * Words for the contract's enums (content modes, states). Product TYPES are never named here:
 * their names, groups and rules come from GET /v1/product-types.
 */
export const modeWords: Record<ContentMode, { short: string; buyer: string }> = {
  STREAM_ONLY: { short: 'Stream in the app', buyer: 'Buyers watch or listen in the app.' },
  DOWNLOAD_LIMITED: {
    short: 'File',
    buyer: 'Buyers open or download the file in the app (up to 5 downloads).',
  },
  LINK: { short: 'Link', buyer: 'Buyers get your link after they pay.' },
};

export const stateBadge: Record<ProductState, { label: string; variant: BadgeVariant }> = {
  live: { label: 'Live', variant: 'success' },
  draft: { label: 'Draft', variant: 'neutral' },
  pending_review: { label: 'In review', variant: 'warning' },
  unpublished: { label: 'Unpublished', variant: 'neutral' },
};

export const assetWords: Record<AssetStatus, string> = {
  uploading: 'Uploading',
  scanning: 'Checking for viruses…',
  processing: 'Processing…',
  ready: 'Ready',
  rejected: 'Rejected',
};

export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(/\.0$/, '')} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1).replace(/\.0$/, '')} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return s ? `${m} min ${s} s` : `${m} min`;
  return `${s} s`;
}

/** Large uploads on mobile data get a warning first. */
export const MOBILE_DATA_WARNING_BYTES = 20 * 1024 * 1024;
