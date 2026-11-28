'use client';

import { appStoreUrl, playStoreUrl } from '@nexa/config/site';

import { track } from '@/lib/analytics';
import { IOS_FALLBACK_MS, openInAppHref, storeListingUrl } from '@/lib/app-links';

import { usePlatform, useRefCode } from './client-state';

type Props = {
  /** This page's path, e.g. "/adaezeprints". The app opens the same path. */
  path: string;
  /** Label of the main button (product pages: "Buy in the app"). */
  primaryLabel?: string;
};

const button =
  'flex w-full items-center justify-center rounded-md px-4 py-3 text-base font-semibold';

/**
 * "Open in app" + "Get the app". Android: intent:// link (opens the app via App Links, or the
 * Play Store). iOS: tries nexahub://… and goes to the App Store if the app didn't open.
 * Desktop: both store links.
 */
export function AppActions({ path, primaryLabel = 'Open in app' }: Props) {
  const platform = usePlatform();
  const ref = useRefCode();

  function onOpen(event: React.MouseEvent<HTMLAnchorElement>) {
    track('open_in_app_click', { platform, path, ref });
    if (platform !== 'ios') return; // the href does the work
    event.preventDefault();
    const started = Date.now();
    const fallback = window.setTimeout(() => {
      // Still here and visible: the app isn't installed.
      if (document.visibilityState === 'visible' && Date.now() - started < IOS_FALLBACK_MS * 3) {
        window.location.href = appStoreUrl;
      }
    }, IOS_FALLBACK_MS);
    document.addEventListener(
      'visibilitychange',
      () => document.visibilityState === 'hidden' && window.clearTimeout(fallback),
      { once: true },
    );
    window.location.href = openInAppHref('ios', path, ref);
  }

  return (
    <div className="flex flex-col gap-2" data-testid="app-actions">
      {platform === 'other' ? (
        <>
          <a
            href={playStoreUrl(ref)}
            className={`${button} bg-primary text-text-inverse`}
            onClick={() => track('get_app_click', { platform: 'android', path, ref })}
            data-testid="get-app-android">
            {primaryLabel === 'Open in app' ? 'Get it on Google Play' : `${primaryLabel} (Android)`}
          </a>
          <a
            href={appStoreUrl}
            className={`${button} border border-text bg-surface text-text`}
            onClick={() => track('get_app_click', { platform: 'ios', path, ref })}
            data-testid="get-app-ios">
            {primaryLabel === 'Open in app'
              ? 'Download on the App Store'
              : `${primaryLabel} (iPhone)`}
          </a>
        </>
      ) : (
        <>
          <a
            href={openInAppHref(platform, path, ref)}
            onClick={onOpen}
            className={`${button} bg-primary text-text-inverse`}
            data-testid="open-in-app">
            {primaryLabel}
          </a>
          <a
            href={storeListingUrl(platform, ref)}
            onClick={() => track('get_app_click', { platform, path, ref })}
            className={`${button} border border-text bg-surface text-text`}
            data-testid="get-app">
            Get the app
          </a>
        </>
      )}
    </div>
  );
}
