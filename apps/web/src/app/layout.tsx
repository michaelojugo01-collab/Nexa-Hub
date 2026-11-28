import { site, siteUrl } from '@nexa/config/site';
import { chromeGradient, colorVar, lightColors, type ThemeColors } from '@nexa/ui';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${site.name} · ${site.tagline}`, template: `%s` },
  description: site.description,
  applicationName: site.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: lightColors.bg,
};

/** The same semantic colour variables the app sets (bg-surface → var(--color-surface)). */
const themeCss = `:root{${(Object.keys(lightColors) as (keyof ThemeColors)[])
  .map((key) => `${colorVar(key)}:${lightColors[key]}`)
  .join(';')};--chrome-gradient:linear-gradient(135deg,${chromeGradient.colors
  .map((c, i) => `${c} ${Math.round(chromeGradient.locations[i]! * 100)}%`)
  .join(',')})}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG">
      <head>
        <style>{themeCss}</style>
      </head>
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
