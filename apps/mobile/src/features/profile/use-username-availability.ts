import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { isOfflineError } from '@/lib/api/error-message';
import { queryKeys } from '@/lib/api/query-keys';
import { usernameSchema } from '@/lib/schemas';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export type UsernameStatus =
  | { state: 'idle' }
  | { state: 'invalid'; message: string }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken' }
  | { state: 'reserved' }
  | { state: 'unchanged' }
  | { state: 'unknown'; offline: boolean };

export const DEBOUNCE_MS = 400;

/**
 * Live availability: format is checked locally first; the server is asked only for valid
 * names, 400ms after typing stops. Advisory only — saving re-checks on the server.
 */
export function useUsernameAvailability(raw: string, current?: string | null): UsernameStatus {
  const username = raw.trim().toLowerCase();
  const debounced = useDebouncedValue(username, DEBOUNCE_MS);
  const parsed = usernameSchema.safeParse(username);
  const shouldCheck = parsed.success && debounced === username && username !== current;

  const query = useQuery({
    queryKey: queryKeys.usernameAvailability(debounced),
    queryFn: () => api.checkUsername(debounced),
    enabled: shouldCheck,
    staleTime: 30_000,
    retry: false,
  });

  if (!username) return { state: 'idle' };
  if (!parsed.success)
    return { state: 'invalid', message: parsed.error.issues[0]?.message ?? 'Invalid' };
  if (username === current) return { state: 'unchanged' };
  if (debounced !== username || query.isPending) return { state: 'checking' };
  if (query.isError) return { state: 'unknown', offline: isOfflineError(query.error) };
  const result = query.data;
  if (!result) return { state: 'checking' };
  if (result.available) return { state: 'available' };
  if (result.reason === 'reserved') return { state: 'reserved' };
  if (result.reason === 'invalid')
    return { state: 'invalid', message: 'That username isn’t allowed' };
  return { state: 'taken' };
}

/** Helper/error text for the username Input. */
export function usernameFieldText(status: UsernameStatus): { error?: string; helper?: string } {
  switch (status.state) {
    case 'invalid':
      return { error: status.message };
    case 'checking':
      return { helper: 'Checking…' };
    case 'available':
      return { helper: '✓ Available' };
    case 'taken':
      return { error: 'That username is taken' };
    case 'reserved':
      return { error: 'That username isn’t available' };
    case 'unknown':
      return {
        helper: status.offline
          ? 'You’re offline — we’ll check when you save'
          : 'Couldn’t check right now — we’ll check when you save',
      };
    case 'unchanged':
      return { helper: 'This is your current username' };
    default:
      return { helper: '3–20 characters: lowercase letters, numbers and _' };
  }
}

export function usernameBlocksSave(status: UsernameStatus) {
  return ['invalid', 'checking', 'taken', 'reserved'].includes(status.state);
}
