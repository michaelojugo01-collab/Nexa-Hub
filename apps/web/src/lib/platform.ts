export type Platform = 'ios' | 'android' | 'other';

/** From a user agent. iPadOS reports a Mac UA, so callers pass touch support too. */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return 'other';
}
