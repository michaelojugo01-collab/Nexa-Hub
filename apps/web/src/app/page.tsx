import { site } from '@nexa/config/site';
import type { Metadata } from 'next';

import { AppActions } from '@/components/AppActions';
import { PageShell } from '@/components/PageShell';
import { RefCodeBox } from '@/components/RefCodeBox';
import { canonicalUrl, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const metadata: Metadata = {
  title: `${site.name} · ${site.tagline}`,
  description: site.description,
  alternates: { canonical: canonicalUrl('/') },
  openGraph: {
    type: 'website',
    url: canonicalUrl('/'),
    siteName: site.name,
    title: `${site.name} · ${site.tagline}`,
    description: site.description,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: site.name }],
  },
  twitter: { card: 'summary_large_image', images: [DEFAULT_OG_IMAGE] },
  itunes: { appId: site.ios.appStoreId },
};

const points = [
  ['Sell anything', 'Digital downloads, courses, services and physical products, from one store.'],
  ['Get paid in naira', 'Buyers pay in the app; you get paid to your Nigerian bank account.'],
  ['Share one link', 'Your store link works on WhatsApp, Instagram and TikTok.'],
] as const;

export default function HomePage() {
  return (
    <PageShell path="/" type="home">
      <section className="flex flex-col gap-5 px-4 pb-8 pt-6">
        <span className="chrome-bar h-1.5 w-20 rounded-full" aria-hidden />
        <h1 className="text-3xl font-bold text-text">{site.tagline}</h1>
        <p className="text-base text-text-muted">{site.description}</p>
        <RefCodeBox path="/" />
        <AppActions path="/" />
      </section>
      <section className="grid gap-3 px-4" aria-label="Why Nexa Hub">
        {points.map(([title, text]) => (
          <div key={title} className="rounded-lg border border-border p-4">
            <h2 className="text-base font-semibold text-text">{title}</h2>
            <p className="mt-1 text-sm text-text-muted">{text}</p>
          </div>
        ))}
      </section>
    </PageShell>
  );
}
