import type { ConfigContext, ExpoConfig } from 'expo/config';

import { site } from '@nexa/config/site';

/**
 * app.json holds the static config; this adds what comes from the shared site config
 * (packages/config/site.ts): universal links (iOS) and verified App Links (Android) for the
 * public web domain, so https://{domain}/{store} etc. open the app (F3).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  scheme: site.scheme,
  ios: {
    ...config.ios,
    associatedDomains: [`applinks:${site.domain}`, `webcredentials:${site.domain}`],
  },
  android: {
    ...config.android,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: site.domain },
          { scheme: 'https', host: `www.${site.domain}` },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
});
