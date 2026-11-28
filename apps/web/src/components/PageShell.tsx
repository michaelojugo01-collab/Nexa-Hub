import type { ReactNode } from 'react';

import type { PageType } from '@/lib/analytics';

import { AndroidBanner } from './AndroidBanner';
import { PageView } from './PageView';
import { SiteFooter, SiteHeader } from './SiteHeader';

/** Banner, header, page, footer and the page_view event. */
export function PageShell({
  path,
  type,
  children,
}: {
  path: string;
  type: PageType;
  children: ReactNode;
}) {
  return (
    <>
      <AndroidBanner path={path} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-page">{children}</main>
      <SiteFooter />
      <PageView type={type} path={path} />
    </>
  );
}
