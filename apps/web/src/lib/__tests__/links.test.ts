import { describe, expect, it } from 'vitest';

import { androidIntentUrl, appSchemeUrl, openInAppHref, storeListingUrl } from '../app-links';
import { detectPlatform } from '../platform';
import { parseRefCode, withRef } from '../ref-code';

describe('ref codes', () => {
  it('reads ?ref= and keeps it upper case', () => {
    expect(parseRefCode('?ref=ada25')).toBe('ADA25');
    expect(parseRefCode('?utm_source=wa&ref=CAMPUS_LAG-01')).toBe('CAMPUS_LAG-01');
  });
  it('ignores missing or odd codes', () => {
    expect(parseRefCode('')).toBeNull();
    expect(parseRefCode('?ref=')).toBeNull();
    expect(parseRefCode('?ref=<script>')).toBeNull();
    expect(parseRefCode(`?ref=${'a'.repeat(40)}`)).toBeNull();
  });
  it('adds the code to links', () => {
    expect(withRef('/adaezeprints', 'ADA25')).toBe('/adaezeprints?ref=ADA25');
    expect(withRef('/a?x=1', 'ADA25')).toBe('/a?x=1&ref=ADA25');
    expect(withRef('/a', null)).toBe('/a');
  });
});

describe('app links', () => {
  it('builds the app scheme link', () => {
    expect(appSchemeUrl('/adaezeprints/adire-textile-mockups')).toBe(
      'nexahub://adaezeprints/adire-textile-mockups',
    );
  });

  it('Android: intent:// opens the https link in the app, Play Store as fallback with the ref', () => {
    const url = androidIntentUrl('/adaezeprints', 'ADA25');
    expect(url.startsWith('intent://nexahub.app/adaezeprints?ref=ADA25#Intent;')).toBe(true);
    expect(url).toContain('scheme=https;');
    expect(url).toContain('package=ng.nexahub.app;');
    const fallback = decodeURIComponent(/S\.browser_fallback_url=([^;]+)/.exec(url)![1]!);
    expect(fallback).toBe(
      'https://play.google.com/store/apps/details?id=ng.nexahub.app&referrer=ref%3DADA25',
    );
    expect(url.endsWith(';end')).toBe(true);
  });

  it('picks the right first link per platform', () => {
    expect(openInAppHref('ios', '/adaezeprints', null)).toBe('nexahub://adaezeprints');
    expect(openInAppHref('android', '/adaezeprints', null)).toMatch(/^intent:\/\//);
    expect(openInAppHref('other', '/adaezeprints', 'X1')).toBe(
      'https://nexahub.app/adaezeprints?ref=X1',
    );
    expect(storeListingUrl('ios', 'X1')).toBe('https://apps.apple.com/app/id0000000000');
    expect(storeListingUrl('android', null)).toBe(
      'https://play.google.com/store/apps/details?id=ng.nexahub.app',
    );
  });
});

describe('platform detection', () => {
  it.each([
    ['Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/131 Mobile', 0, 'android'],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [WhatsApp]',
      0,
      'ios',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      5,
      'ios',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      0,
      'other',
    ],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131', 0, 'other'],
  ] as const)('%s → %s', (ua, touch, platform) => {
    expect(detectPlatform(ua, touch)).toBe(platform);
  });
});
