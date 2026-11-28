import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { useDebouncedValue } from '@/lib/use-debounced-value';

/**
 * GET /v1/fees/preview: what the seller receives per sale. The server computes the fee;
 * the app never does.
 */
export function useFeePreview(priceKobo: number | null) {
  const debounced = useDebouncedValue(priceKobo, 400);
  return useQuery({
    queryKey: queryKeys.feePreview(debounced ?? -1),
    queryFn: () => api.previewFee(debounced!),
    enabled: debounced !== null && debounced > 0,
    staleTime: 10 * 60_000,
    retry: false,
  });
}
