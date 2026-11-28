import type { AssetKind, OwnProduct, ProductUpdate } from '@nexa/api-contract';
import { useNetworkState } from 'expo-network';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/error-message';
import { toast } from '@/stores/toast-store';

import { formatBytes, MOBILE_DATA_WARNING_BYTES } from './product-ui';
import { restoreUploads, uploader, useUploadJobs, type UploadJob } from './upload';
import { keepForUpload } from './upload/files';
import { applyOwnProduct } from './use-own-product';

const attached = new Set<string>();

const field: Record<AssetKind, keyof ProductUpdate> = {
  main: 'mainAssetId',
  cover: 'coverAssetId',
  preview: 'previewAssetId',
};

/** The newest upload job for this product and kind (if any). */
export function useUploadJob(productId: string, kind: AssetKind): UploadJob | undefined {
  return useUploadJobs(
    (s) =>
      Object.values(s.jobs)
        .filter((j) => j.productId === productId && j.kind === kind)
        .sort((a, b) => b.createdAt - a.createdAt)[0],
  );
}

function confirm(title: string, message: string, ok: string) {
  if (Platform.OS === 'web') return Promise.resolve(true);
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, onPress: () => resolve(true) },
    ]),
  );
}

/**
 * Upload one file for a product through the shared Uploader, then attach it (PATCH) when
 * storage has it all. Warns before a large upload on mobile data.
 */
export function useProductUpload(product: OwnProduct, kind: AssetKind) {
  const network = useNetworkState();
  const job = useUploadJob(product.id, kind);

  useEffect(() => {
    void restoreUploads();
  }, []);

  // Storage has the whole file: point the product at it.
  useEffect(() => {
    if (job?.status !== 'done' || !job.assetId || attached.has(job.assetId)) return;
    attached.add(job.assetId);
    api
      .updateProduct(job.productId, { [field[kind]]: job.assetId })
      .then(applyOwnProduct)
      .catch((error: unknown) => {
        attached.delete(job.assetId!);
        toast.show(errorMessage(error, 'Couldn’t attach the file. Pull to refresh.'), 'error');
      });
  }, [job?.status, job?.assetId, job?.productId, kind]);

  async function start(file: { uri: string; name: string; mimeType: string; size: number }) {
    if (network.type === 'CELLULAR' && file.size > MOBILE_DATA_WARNING_BYTES) {
      const go = await confirm(
        'Upload on mobile data?',
        `This file is ${formatBytes(file.size)}. Uploading uses your data plan. You can wait for Wi-Fi: the upload can also pause and continue later.`,
        'Upload now',
      );
      if (!go) return;
    }
    const fileUri = keepForUpload(file.uri, file.name);
    await uploader.start({
      productId: product.id,
      kind,
      fileUri,
      fileName: file.name,
      contentType: file.mimeType,
      sizeBytes: file.size,
    });
  }

  return {
    job,
    start,
    pause: () => job && uploader.pause(job.id),
    resume: () => job && void uploader.resume(job.id),
    cancel: () => job && void uploader.cancel(job.id),
  };
}
