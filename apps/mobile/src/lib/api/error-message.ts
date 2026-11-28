import { isApiError } from '@nexa/api-contract';

/** A message that is safe to show: the server's message, or a friendly fallback. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  return isApiError(error) ? error.message : fallback;
}

export function errorCode(error: unknown) {
  return isApiError(error) ? error.code : null;
}

export function isOfflineError(error: unknown) {
  return isApiError(error) && error.isNetworkError;
}
