/**
 * Public store links. PLACEHOLDER domain until the real one is decided (docs/decisions.md);
 * change it here only. The app scheme (app.json "scheme") opens the same paths in the app.
 */
export const STORE_LINK_DOMAIN = 'nexahub.app';
export const APP_SCHEME = 'nexahub';

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
