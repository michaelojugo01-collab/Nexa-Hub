'use client';

import { useEffect } from 'react';

import { track, type PageType } from '@/lib/analytics';
import { parseRefCode } from '@/lib/ref-code';

/** page_view, sent from the browser because cached pages don't run server code per visit. */
export function PageView({ type, path }: { type: PageType; path: string }) {
  useEffect(() => {
    track('page_view', { type, path, ref: parseRefCode(window.location.search) });
  }, [type, path]);
  return null;
}
