import type { StoreUpdate } from '@nexa/api-contract';
import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import { applyOwnStore } from './use-my-store';

/** PATCH /v1/stores. Callers handle errors (field errors vs toast). */
export function useUpdateStore() {
  return useMutation({
    mutationFn: (body: StoreUpdate) => api.updateStore(body),
    onSuccess: (store) => applyOwnStore(store),
  });
}
