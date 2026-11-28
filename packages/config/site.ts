/**
 * Every placeholder for the public site and app links, in ONE place (docs/deep-links.md says
 * how to get the real values). The web (apps/web), the app (store links) and the Expo config
 * (apps/mobile/app.config.ts) all import this file, so the domain and IDs never drift apart.
 *
 * Plain values only: no imports, so Node can load it from the Expo config.
 */
export const site = {
  name: 'Nexa Hub',
  /** PLACEHOLDER until the domain is decided (same constant as the app's store links). */
  domain: 'nexahub.app',
  tagline: 'Sell Anything. Earn Your Freedom',
  description:
    'Buy from and sell to Nigerian creators, students and small businesses: digital products, courses, services and more.',
  /** App scheme (app.json "scheme"). */
  scheme: 'nexahub',

  ios: {
    /** PLACEHOLDER: App Store Connect → App → App Information → Apple ID (numbers only). */
    appStoreId: '0000000000',
    /** Must match app.json ios.bundleIdentifier. */
    bundleId: 'ng.nexahub.app',
    /** PLACEHOLDER: developer.apple.com → Membership details → Team ID (10 characters). */
    teamId: 'ABCDE12345',
  },

  android: {
    /** Must match app.json android.package. */
    package: 'ng.nexahub.app',
    /**
     * PLACEHOLDERS: SHA-256 signing certificate fingerprints, from `eas credentials` (upload
     * or app signing key) and Play Console → App integrity (Google's app signing key).
     */
    sha256Fingerprints: [
      '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
    ],
  },

  /** Pages (and their data) are rebuilt at most this often. */
  revalidateSeconds: 60,
} as const;

export const siteUrl = `https://${site.domain}`;

export const appStoreUrl = `https://apps.apple.com/app/id${site.ios.appStoreId}`;

/** Google Play listing; `referrer` lets a later app version read a ref code after install. */
export function playStoreUrl(ref?: string | null) {
  const base = `https://play.google.com/store/apps/details?id=${site.android.package}`;
  return ref ? `${base}&referrer=${encodeURIComponent(`ref=${ref}`)}` : base;
}
