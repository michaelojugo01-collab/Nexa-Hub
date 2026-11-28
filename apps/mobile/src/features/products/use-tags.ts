import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { useDebouncedValue } from '@/lib/use-debounced-value';

/** GET /v1/tags?q= suggestions, 300ms after typing stops. */
export function useTagSuggestions(text: string) {
  const q = useDebouncedValue(text.trim().toLowerCase(), 300);
  return useQuery({
    queryKey: queryKeys.tags(q),
    queryFn: async () => (await api.listTags(q, 8)).data,
    staleTime: 10 * 60_000,
  });
}
