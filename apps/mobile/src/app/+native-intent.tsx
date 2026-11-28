import { mapIncomingLink } from '@/lib/incoming-link';
import { logger } from '@/lib/logger';

/** Rewrites links that open the app (universal links, App Links, nexahub://) to app routes. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return mapIncomingLink(path);
  } catch (error) {
    logger.warn('Could not map incoming link', error);
    return '/';
  }
}
