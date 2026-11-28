import { site } from '@nexa/config/site';

/**
 * Public store links. The domain (a PLACEHOLDER until decided) and scheme live in
 * packages/config/site.ts, shared with the web and the Expo config.
 */
export const STORE_LINK_DOMAIN = site.domain;
export const APP_SCHEME = site.scheme;

/** https://nexahub.app/adaezeprints — what sellers share. */
export function storeUrl(slug: string) {
  return `https://${STORE_LINK_DOMAIN}/${slug}`;
}

/** nexahub.app/adaezeprints — for display. */
export function storeLinkLabel(slug: string) {
  return `${STORE_LINK_DOMAIN}/${slug}`;
}

/** nexahub://store/adaezeprints — opens the store screen in the app. */
export function storeAppUrl(slug: string) {
  return `${APP_SCHEME}://store/${slug}`;
}
