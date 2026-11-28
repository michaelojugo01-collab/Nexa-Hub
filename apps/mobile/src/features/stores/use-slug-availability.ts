import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { isOfflineError } from '@/lib/api/error-message';
import { queryKeys } from '@/lib/api/query-keys';
import { slugProblem, slugProblemText } from '@/lib/slug';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export type SlugStatus =
  | { state: 'idle' }
  | { state: 'invalid'; message: string }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken' }
  | { state: 'reserved' }
  | { state: 'unchanged' }
  | { state: 'unknown'; offline: boolean };

export const SLUG_DEBOUNCE_MS = 400;

/**
 * Live store-link check: format locally first, then the server (taken / reserved), 400ms
 * after typing stops. Advisory only: creating or saving the store re-checks.
 */
export function useSlugAvailability(slug: string, current?: string | null): SlugStatus {
  const debounced = useDebouncedValue(slug, SLUG_DEBOUNCE_MS);
  const problem = slugProblem(slug);
  const shouldCheck = !problem && debounced === slug && slug !== current;

  const query = useQuery({
    queryKey: queryKeys.slugAvailability(debounced),
    queryFn: () => api.checkSlug(debounced),
    enabled: shouldCheck,
    staleTime: 30_000,
    retry: false,
  });

  if (!slug) return { state: 'idle' };
  if (problem) return { state: 'invalid', message: slugProblemText[problem] };
  if (slug === current) return { state: 'unchanged' };
  if (debounced !== slug || query.isPending) return { state: 'checking' };
  if (query.isError) return { state: 'unknown', offline: isOfflineError(query.error) };
  const result = query.data;
  if (!result) return { state: 'checking' };
  if (result.available) return { state: 'available' };
  if (result.reason === 'reserved') return { state: 'reserved' };
  if (result.reason === 'invalid') return { state: 'invalid', message: 'That link isn’t allowed' };
  return { state: 'taken' };
}

export function slugFieldText(status: SlugStatus): { error?: string; helper?: string } {
  switch (status.state) {
    case 'invalid':
      return { error: status.message };
    case 'checking':
      return { helper: 'Checking…' };
    case 'available':
      return { helper: '✓ Available' };
    case 'taken':
      return { error: 'That link is taken. Try another.' };
    case 'reserved':
      return { error: 'That link is reserved. Try another.' };
    case 'unknown':
      return {
        helper: status.offline
          ? 'You’re offline. We’ll check when you publish.'
          : 'Couldn’t check right now. We’ll check when you publish.',
      };
    case 'unchanged':
      return { helper: 'This is your current link' };
    default:
      return { helper: '3–30 lowercase letters, numbers and hyphens' };
  }
}

export function slugBlocksNext(status: SlugStatus) {
  return ['idle', 'invalid', 'checking', 'taken', 'reserved'].includes(status.state);
}
