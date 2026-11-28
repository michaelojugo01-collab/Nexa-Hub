'use client';

import { useSyncExternalStore } from 'react';

import { detectPlatform, type Platform } from '@/lib/platform';
import { parseRefCode } from '@/lib/ref-code';

/*
 * Browser-only facts, read after hydration. Pages are cached HTML (the same for everyone), so
 * the platform and ?ref= code are read here instead of on the server.
 */

const noop = () => () => {};

export function usePlatform(): Platform {
  return useSyncExternalStore(
    noop,
    () => detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
    () => 'other',
  );
}

export function useRefCode(): string | null {
  return useSyncExternalStore(
    noop,
    () => parseRefCode(window.location.search),
    () => null,
  );
}
