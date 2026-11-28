import { appStoreUrl, playStoreUrl, site, siteUrl } from '@nexa/config/site';

import type { Platform } from './platform';
import { withRef } from './ref-code';

/**
 * Where "Open in app" and "Get the app" go. `path` is the page's own path, e.g.
 * "/adaezeprints/ankara-print-pattern-pack-40-designs" — the app maps the same paths.
 */

/** nexahub://adaezeprints/… — opens the app if installed (iOS: tried first, then App Store). */
export function appSchemeUrl(path: string) {
  return `${site.scheme}://${path.replace(/^\//, '')}`;
}

/**
 * Android: opens the https link in the app (App Links) when installed; otherwise Chrome
 * goes to the Play Store listing, carrying the ref code as the install referrer.
 */
export function androidIntentUrl(path: string, ref: string | null) {
  const fallback = encodeURIComponent(playStoreUrl(ref));
  return (
    `intent://${site.domain}${withRef(path, ref)}` +
    `#Intent;scheme=https;package=${site.android.package};S.browser_fallback_url=${fallback};end`
  );
}

export function storeListingUrl(platform: Platform, ref: string | null) {
  return platform === 'ios' ? appStoreUrl : playStoreUrl(ref);
}

/** The href "Open in app" starts with on each platform (iOS adds a timed fallback in JS). */
export function openInAppHref(platform: Platform, path: string, ref: string | null) {
  if (platform === 'android') return androidIntentUrl(path, ref);
  if (platform === 'ios') return appSchemeUrl(withRef(path, ref));
  return `${siteUrl}${withRef(path, ref)}`;
}

/** How long iOS waits for the app to open before going to the App Store. */
export const IOS_FALLBACK_MS = 1500;
