import {
  isValidProductLink,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_MIN_PRICE_KOBO,
  PRODUCT_TAGS_MAX,
  PRODUCT_TITLE_MAX,
  type ContentMode,
  type OwnProduct,
  type ProductUpdate,
} from '@nexa/api-contract';
import { koboToNairaInput, parseNairaToKobo } from '@nexa/ui';
import { File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api/client';
import { errorMessage, isOfflineError } from '@/lib/api/error-message';
import { logger } from '@/lib/logger';

import { applyOwnProduct } from './use-own-product';

/** What the seller is editing. Text fields keep exactly what they typed. */
export type DraftValues = {
  title: string;
  description: string;
  categorySlug: string;
  tags: string[];
  priceText: string;
  contentMode: ContentMode;
  linkUrl: string;
  previewPages: number;
  /** "draft" = keep as a draft (not a server visibility). */
  visibility: 'public' | 'unlisted' | 'draft';
  rightsDeclared: boolean;
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

type LocalDraft = { productId: string; values: DraftValues; savedAt: number; synced: boolean };

export const SERVER_SAVE_DELAY_MS = 1500;

const draftFile = (productId: string) =>
  new File(Paths.document, `nexa-product-draft-${productId.replace(/[^\w-]/g, '')}.json`);

export function readLocalDraft(productId: string): LocalDraft | null {
  try {
    const file = draftFile(productId);
    return file.exists ? (JSON.parse(file.textSync()) as LocalDraft) : null;
  } catch {
    return null;
  }
}

function writeLocalDraft(draft: LocalDraft) {
  try {
    const file = draftFile(draft.productId);
    if (!file.exists) file.create();
    file.write(JSON.stringify(draft));
  } catch (error) {
    logger.warn('Could not save the draft on this phone', error);
  }
}

export function clearLocalDraft(productId: string) {
  try {
    const file = draftFile(productId);
    if (file.exists) file.delete();
  } catch {
    // Nothing to clear.
  }
}

export function valuesFromProduct(product: OwnProduct): DraftValues {
  return {
    title: product.title,
    description: product.description,
    categorySlug: product.categorySlug ?? '',
    tags: product.tags,
    priceText: product.price ? koboToNairaInput(product.price.amountKobo) : '',
    contentMode: product.contentMode,
    linkUrl: product.linkUrl ?? '',
    previewPages: product.previewPages,
    visibility: product.state === 'draft' ? 'public' : product.visibility,
    rightsDeclared: !!product.rightsDeclaredAt,
  };
}

/**
 * The fields that changed AND are valid enough to send. Invalid ones stay on the phone until
 * the seller fixes them (the screen shows why), so autosave never fails on a half-typed value.
 */
export function toPatch(values: DraftValues, product: OwnProduct): ProductUpdate {
  const patch: ProductUpdate = {};
  const title = values.title.trim();
  if (title !== product.title && title.length <= PRODUCT_TITLE_MAX) patch.title = title;
  const description = values.description.trim();
  if (description !== product.description && description.length <= PRODUCT_DESCRIPTION_MAX) {
    patch.description = description;
  }
  if (values.categorySlug && values.categorySlug !== product.categorySlug) {
    patch.categorySlug = values.categorySlug;
  }
  if (
    values.tags.length <= PRODUCT_TAGS_MAX &&
    JSON.stringify(values.tags) !== JSON.stringify(product.tags)
  ) {
    patch.tags = values.tags;
  }
  const kobo = parseNairaToKobo(values.priceText);
  if (kobo !== null && kobo >= PRODUCT_MIN_PRICE_KOBO && kobo !== product.price?.amountKobo) {
    patch.price = { amountKobo: kobo, currency: 'NGN' };
  }
  if (product.state === 'draft' && values.contentMode !== product.contentMode) {
    patch.contentMode = values.contentMode;
  }
  const link = values.linkUrl.trim();
  if (link !== (product.linkUrl ?? '') && (link === '' || isValidProductLink(link))) {
    patch.linkUrl = link || null;
  }
  if (values.previewPages !== product.previewPages) patch.previewPages = values.previewPages;
  if (values.rightsDeclared !== !!product.rightsDeclaredAt) {
    patch.rightsDeclared = values.rightsDeclared;
  }
  if (
    product.state !== 'draft' &&
    values.visibility !== 'draft' &&
    values.visibility !== product.visibility
  ) {
    patch.visibility = values.visibility;
  }
  return patch;
}

/**
 * Draft autosave: every change is written to a file on the phone at once, and sent to the
 * API 1.5 s after typing stops. Offline or failed saves keep the phone copy and retry.
 * On open, a phone copy newer than the server's wins (a crash or bad network loses nothing).
 */
export function useProductDraft(product: OwnProduct, online: boolean) {
  const [values, setValues] = useState<DraftValues>(() => {
    const local = readLocalDraft(product.id);
    return local && local.savedAt > Date.parse(product.updatedAt)
      ? local.values
      : valuesFromProduct(product);
  });
  const [status, setStatus] = useState<SaveStatus>(() => {
    const local = readLocalDraft(product.id);
    return local && !local.synced && local.savedAt > Date.parse(product.updatedAt)
      ? 'offline'
      : 'idle';
  });
  const [error, setError] = useState<string | null>(null);
  const latest = useRef({ values, product });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    latest.current.product = product;
  }, [product]);

  async function sendNow() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { values: current, product: base } = latest.current;
    const patch = toPatch(current, base);
    if (Object.keys(patch).length === 0) {
      writeLocalDraft({ productId: base.id, values: current, savedAt: Date.now(), synced: true });
      setStatus('saved');
      return;
    }
    setStatus('saving');
    try {
      const saved = await api.updateProduct(base.id, patch);
      latest.current.product = saved;
      applyOwnProduct(saved);
      writeLocalDraft({
        productId: base.id,
        values: latest.current.values,
        savedAt: Date.now(),
        synced: true,
      });
      setError(null);
      setStatus('saved');
    } catch (e) {
      if (isOfflineError(e)) {
        setStatus('offline');
      } else {
        setError(errorMessage(e));
        setStatus('error');
      }
    }
  }

  /** Send what's pending now (before publishing or leaving). */
  async function flush() {
    if (inFlight.current) await inFlight.current;
    inFlight.current = sendNow().finally(() => {
      inFlight.current = null;
    });
    await inFlight.current;
  }

  function update(patch: Partial<DraftValues>) {
    setValues((prev) => {
      const next = { ...prev, ...patch };
      latest.current.values = next;
      writeLocalDraft({ productId: product.id, values: next, savedAt: Date.now(), synced: false });
      return next;
    });
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SERVER_SAVE_DELAY_MS);
  }

  // Back online with unsent changes: send them.
  useEffect(() => {
    if (online && (status === 'offline' || status === 'error') && !timer.current) {
      const t = setTimeout(() => void flush(), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, status]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { values, update, status, error, flush };
}

export function saveStatusText(status: SaveStatus, online: boolean) {
  if (!online || status === 'offline') return 'Offline, saved on this phone';
  if (status === 'saving') return 'Saving…';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return 'Not saved. Check the highlighted field.';
  return '';
}
