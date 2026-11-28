/**
 * Money is always an integer number of kobo (₦1 = 100 kobo). NGN only.
 * Apps only format amounts the server sends; they never calculate prices or fees.
 * Shared by the mobile app (PriceText) and the web pages.
 */

const NAIRA = '₦';

function groupThousands(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export type FormatKoboOptions = {
  /** Always show two kobo digits (₦4,500.00). Default: only when the amount has kobo. */
  alwaysShowKobo?: boolean;
};

/**
 * 450000 → "₦4,500", 450050 → "₦4,500.50", -25000 → "-₦250".
 * Throws if the value is not a safe integer — a decimal here is a bug upstream.
 */
export function formatKobo(amountKobo: number, options: FormatKoboOptions = {}): string {
  if (!Number.isSafeInteger(amountKobo)) {
    throw new TypeError(`formatKobo expects an integer number of kobo, got ${amountKobo}`);
  }

  const sign = amountKobo < 0 ? '-' : '';
  const abs = Math.abs(amountKobo);
  const naira = Math.floor(abs / 100);
  const kobo = abs % 100;

  const whole = `${sign}${NAIRA}${groupThousands(String(naira))}`;
  if (kobo === 0 && !options.alwaysShowKobo) return whole;
  return `${whole}.${String(kobo).padStart(2, '0')}`;
}

/** Screen-reader version: "4,500 naira 50 kobo". */
export function speakKobo(amountKobo: number): string {
  if (!Number.isSafeInteger(amountKobo)) return 'price unavailable';
  const sign = amountKobo < 0 ? 'minus ' : '';
  const abs = Math.abs(amountKobo);
  const naira = Math.floor(abs / 100);
  const kobo = abs % 100;
  const nairaPart = `${groupThousands(String(naira))} naira`;
  return kobo === 0 ? `${sign}${nairaPart}` : `${sign}${nairaPart} ${kobo} kobo`;
}

/**
 * What a seller types as a naira price → integer kobo, with string maths (no floating point):
 * "1,500.50" → 150050, "₦2,000" → 200000, "0.1" → 10. Returns null for anything that isn't a
 * plain non-negative naira amount with at most 2 decimals ("1e3", "12.345", "-5", "abc").
 */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.trim().replace(/^₦\s*/, '').replace(/^NGN\s*/i, '');
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.replace(/,/g, '').split('.');
  const kobo = Number(whole) * 100 + Number(fraction.padEnd(2, '0') || '0');
  return Number.isSafeInteger(kobo) ? kobo : null;
}

/** Kobo → what goes back into a price field: 150050 → "1500.50", 200000 → "2000". */
export function koboToNairaInput(amountKobo: number): string {
  const naira = Math.floor(amountKobo / 100);
  const kobo = amountKobo % 100;
  return kobo === 0 ? String(naira) : `${naira}.${String(kobo).padStart(2, '0')}`;
}
