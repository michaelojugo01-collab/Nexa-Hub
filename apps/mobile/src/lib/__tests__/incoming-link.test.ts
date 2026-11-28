import { mapIncomingLink } from '../incoming-link';

describe('mapIncomingLink', () => {
  it.each([
    // Public web links (universal links / App Links)
    ['https://nexahub.app/adaezeprints', '/store/adaezeprints'],
    ['https://www.nexahub.app/adaezeprints', '/store/adaezeprints'],
    ['https://nexahub.app/AdaezePrints', '/store/adaezeprints'],
    ['https://nexahub.app/adaezeprints/', '/store/adaezeprints'],
    [
      'https://nexahub.app/adaezeprints/ankara-print-pattern-pack-40-designs',
      '/product/adaezeprints/ankara-print-pattern-pack-40-designs',
    ],
    ['https://nexahub.app/@adaeze', '/user/adaeze'],
    ['https://nexahub.app/%40adaeze', '/user/adaeze'],
    ['https://nexahub.app/adaezeprints?ref=ADA25', '/store/adaezeprints?ref=ADA25'],
    ['https://nexahub.app/', '/'],
    ['https://nexahub.app', '/'],
    // Same paths with the app scheme
    ['nexahub://adaezeprints', '/store/adaezeprints'],
    ['nexahub://adaezeprints/adire-textile-mockups', '/product/adaezeprints/adire-textile-mockups'],
    ['nexahub://@chidi', '/user/chidi'],
    // App routes pass through
    ['nexahub://store/jollofacademy', '/store/jollofacademy'],
    ['nexahub://seller/setup', '/seller/setup'],
    ['/store/kolacreates', '/store/kolacreates'],
    // Plain paths (already inside the app)
    ['/kolacreates', '/store/kolacreates'],
    ['/', '/'],
  ])('%s → %s', (url, route) => {
    expect(mapIncomingLink(url)).toBe(route);
  });

  it.each([
    'https://nexahub.app/a',
    'https://nexahub.app/sitemap.xml',
    'https://nexahub.app/.well-known/apple-app-site-association',
    'https://nexahub.app/ada--eze',
    'https://nexahub.app/adaezeprints/x',
    'https://nexahub.app/adaezeprints/a/b',
    'https://nexahub.app/@a',
    'https://nexahub.app/@bad-name!',
    'nexahub://%E0%A4%A',
  ])('opens Home for unknown links: %s', (url) => {
    expect(mapIncomingLink(url)).toBe('/');
  });

  it.each([
    'exp+nexahub://expo-development-client/?url=http%3A%2F%2F192.168.1.10%3A8081',
    'exp://192.168.1.10:8081/--/store/adaezeprints',
    'https://example.com/adaezeprints',
    'https://evil-nexahub.app/adaezeprints',
  ])('leaves other URLs alone: %s', (url) => {
    expect(mapIncomingLink(url)).toBe(url);
  });
});
