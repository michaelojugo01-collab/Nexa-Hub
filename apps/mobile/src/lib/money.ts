/**
 * Money is always an integer number of kobo (₦1 = 100 kobo). NGN only.
 * The app only formats amounts the server sends; it never calculates prices or fees.
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
