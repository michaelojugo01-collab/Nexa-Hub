/**
 * Nigerian mobile numbers. The server normalises too; the app does it first so the user gets
 * instant feedback and the request always carries E.164 (+234XXXXXXXXXX).
 *
 * National significant number: 10 digits, starting 70, 71, 80, 81, 90 or 91.
 */

const NSN = /^[789][01]\d{8}$/;

export type PhoneResult = { ok: true; e164: string } | { ok: false; reason: 'empty' | 'invalid' };

/** Accepts 0803 123 4567, 803-123-4567, +234 803…, 234803…, +2340803… and similar. */
export function normaliseNigerianPhone(input: string): PhoneResult {
  const compact = input.replace(/[\s\-().]/g, '');
  if (compact === '') return { ok: false, reason: 'empty' };
  if (!/^\+?\d+$/.test(compact)) return { ok: false, reason: 'invalid' };

  let rest = compact.replace(/^\+/, '');
  if (rest.startsWith('234')) rest = rest.slice(3);
  if (rest.startsWith('0')) rest = rest.slice(1); // trunk prefix, incl. +2340803…

  return NSN.test(rest) ? { ok: true, e164: `+234${rest}` } : { ok: false, reason: 'invalid' };
}

/** +2348031234567 → "+234 803 123 4567" */
export function formatNigerianPhone(e164: string) {
  const m = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
