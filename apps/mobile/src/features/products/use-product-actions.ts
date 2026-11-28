import type { ProductVisibility } from '@nexa/api-contract';
import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/api/query-client';
import { queryKeys } from '@/lib/api/query-keys';

import { applyOwnProduct } from './use-own-product';

function refreshPublic() {
  // Store pages, home and public product pages show live products.
  void queryClient.invalidateQueries({ queryKey: queryKeys.stores });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.discoverHome });
  void queryClient.invalidateQueries({ queryKey: queryKeys.myStore });
}

/** POST /v1/products/{id}/publish */
export function usePublishProduct() {
  return useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: ProductVisibility }) =>
      api.publishProduct(id, visibility),
    onSuccess: (product) => {
      applyOwnProduct(product);
      refreshPublic();
    },
  });
}

/** POST /v1/products/{id}/unpublish (proposed) */
export function useUnpublishProduct() {
  return useMutation({
    mutationFn: (id: string) => api.unpublishProduct(id),
    onSuccess: (product) => {
      applyOwnProduct(product);
      refreshPublic();
    },
  });
}

/** POST /v1/products/{id}/republish (proposed) */
export function useRepublishProduct() {
  return useMutation({
    mutationFn: (id: string) => api.republishProduct(id),
    onSuccess: (product) => {
      applyOwnProduct(product);
      refreshPublic();
    },
  });
}
