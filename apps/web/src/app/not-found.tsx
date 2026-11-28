import type { Metadata } from 'next';

import { AppActions } from '@/components/AppActions';
import { PageShell } from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'Not found · Nexa Hub',
  robots: { index: false, follow: false },
};

/** Unknown slug, private store, unpublished product. Always noindex. */
export default function NotFound() {
  return (
    <PageShell path="/" type="not_found">
      <section className="flex flex-col gap-4 px-4 pt-10" data-testid="not-found">
        <h1 className="text-2xl font-bold text-text">We couldn’t find that page</h1>
        <p className="text-base text-text-muted">
          The link may be wrong, or the store may be private or no longer selling this item.
        </p>
        <AppActions path="/" primaryLabel="Discover stores in the app" />
      </section>
    </PageShell>
  );
}
