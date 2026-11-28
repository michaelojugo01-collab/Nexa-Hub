import { describe, expect, it } from 'vitest';

import { GET as aasaGET } from '@/app/.well-known/apple-app-site-association/route';
import { GET as assetLinksGET } from '@/app/.well-known/assetlinks.json/route';

import { appleAppSiteAssociation, assetLinks } from '../well-known';

describe('apple-app-site-association', () => {
  it('names the app and excludes site files', () => {
    const aasa = appleAppSiteAssociation();
    const details = aasa.applinks.details[0]!;
    expect(details.appIDs).toEqual(['ABCDE12345.ng.nexahub.app']);
    const excluded = details.components.filter((c) => c.exclude).map((c) => c['/']);
    expect(excluded).toEqual(
      expect.arrayContaining(['/sitemap.xml', '/robots.txt', '/.well-known/*', '/_next/*']),
    );
    expect(details.components.at(-1)).toMatchObject({ '/': '/*' });
    expect(aasa.webcredentials.apps).toEqual(['ABCDE12345.ng.nexahub.app']);
  });

  it('is served as JSON with 200 and no redirect', async () => {
    const res = aasaGET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('location')).toBeNull();
    expect(await res.json()).toEqual(appleAppSiteAssociation());
  });
});

describe('assetlinks.json', () => {
  it('delegates all URLs to the Android package with its fingerprints', () => {
    const [entry] = assetLinks();
    expect(entry).toEqual({
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'ng.nexahub.app',
        sha256_cert_fingerprints: [expect.stringMatching(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)],
      },
    });
  });

  it('is served as JSON with 200', async () => {
    const res = assetLinksGET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(await res.json()).toEqual(assetLinks());
  });
});
