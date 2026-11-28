'use client';

import { site } from '@nexa/config/site';
import { useState } from 'react';

import { track } from '@/lib/analytics';
import { openInAppHref } from '@/lib/app-links';

import { usePlatform, useRefCode } from './client-state';

const KEY = 'nexa.appBannerDismissed';

function wasDismissed() {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Android's equivalent of the iOS Smart App Banner (iOS Safari shows its own from the
 * apple-itunes-app meta tag). Dismissal is remembered in this browser.
 */
export function AndroidBanner({ path }: { path: string }) {
  const platform = usePlatform();
  const ref = useRefCode();
  const [dismissed, setDismissed] = useState(false);

  if (platform !== 'android' || dismissed || wasDismissed()) return null;

  return (
    <div
      className="flex items-center gap-3 border-b border-border bg-surface-muted px-4 py-2"
      role="region"
      aria-label="Get the Nexa Hub app"
      data-testid="android-banner">
      <button
        type="button"
        aria-label="Close"
        className="px-1 text-lg text-text-muted"
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, '1');
          } catch {
            // Private mode: dismiss for this page only.
          }
          setDismissed(true);
        }}
        data-testid="android-banner-close">
        ×
      </button>
      <div className="flex-1 leading-tight">
        <p className="text-sm font-semibold text-text">{site.name}</p>
        <p className="text-xs text-text-muted">Faster in the app</p>
      </div>
      <a
        href={openInAppHref('android', path, ref)}
        onClick={() => track('open_in_app_click', { platform, path, ref })}
        className="rounded-full bg-primary px-4 py-1 text-sm font-semibold text-text-inverse"
        data-testid="android-banner-open">
        Open
      </a>
    </div>
  );
}
