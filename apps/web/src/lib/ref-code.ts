/** Referral codes from `?ref=CODE`: letters, numbers, - and _, 2–32 characters. */
const REF = /^[A-Za-z0-9_-]{2,32}$/;

export function parseRefCode(search: string): string | null {
  const value = new URLSearchParams(search).get('ref')?.trim();
  return value && REF.test(value) ? value.toUpperCase() : null;
}

/** Adds ?ref=CODE to a site path (keeps the code when people move between pages). */
export function withRef(path: string, ref: string | null) {
  if (!ref) return path;
  return `${path}${path.includes('?') ? '&' : '?'}ref=${encodeURIComponent(ref)}`;
}
