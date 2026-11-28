import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './query-keys';

export function useDiscoverHome() {
  return useQuery({
    queryKey: queryKeys.discoverHome,
    queryFn: () => api.getDiscoverHome(),
  });
}
