import { site } from '@nexa/config/site';

/**
 * iOS universal links. Every page path opens in the app except site files. The app then maps
 * /{store}, /{store}/{product} and /@{user} to screens (apps/mobile/src/app/+native-intent.tsx).
 */
export function appleAppSiteAssociation() {
  const appID = `${site.ios.teamId}.${site.ios.bundleId}`;
  return {
    applinks: {
      details: [
        {
          appIDs: [appID],
          components: [
            { '/': '/_next/*', exclude: true },
            { '/': '/.well-known/*', exclude: true },
            { '/': '/sitemap.xml', exclude: true },
            { '/': '/robots.txt', exclude: true },
            { '/': '/og-default.png', exclude: true },
            { '/': '/favicon.ico', exclude: true },
            { '/': '/', exclude: true, comment: 'The home page stays on the web' },
            { '/': '/*', comment: 'Stores, products and @profiles' },
          ],
        },
      ],
    },
    webcredentials: { apps: [appID] },
  };
}

/** Android App Links: lets the app verify it owns the domain (intentFilters autoVerify). */
export function assetLinks() {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: site.android.package,
        sha256_cert_fingerprints: [...site.android.sha256Fingerprints],
      },
    },
  ];
}

/** Served as JSON, never redirected, cached for an hour. */
export function wellKnownResponse(body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
