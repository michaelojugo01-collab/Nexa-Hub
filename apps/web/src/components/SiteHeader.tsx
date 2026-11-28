import { site } from '@nexa/config/site';
import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-page items-center justify-between px-4 py-3">
      <Link href="/" className="text-lg font-bold tracking-wide text-text" prefetch={false}>
        NEXA HUB
      </Link>
      <span className="chrome-bar h-1.5 w-16 rounded-full" aria-hidden />
      <span className="sr-only">{site.name}</span>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-page px-4 pb-10 pt-8 text-xs text-text-subtle">
      <p>
        {site.name} · {site.tagline}
      </p>
      <p className="mt-1">
        Buying happens in the app. Nexa Hub never asks for card details on this site.
      </p>
    </footer>
  );
}
