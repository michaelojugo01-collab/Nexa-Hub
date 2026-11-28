import { formatKobo, speakKobo } from '../money';

describe('formatKobo', () => {
  it.each([
    [0, '₦0'],
    [1, '₦0.01'],
    [99, '₦0.99'],
    [100, '₦1'],
    [450000, '₦4,500'],
    [450050, '₦4,500.50'],
    [100000000, '₦1,000,000'],
    [123456789, '₦1,234,567.89'],
    [-25000, '-₦250'],
    [-5, '-₦0.05'],
  ])('formats %i kobo as %s', (kobo, expected) => {
    expect(formatKobo(kobo)).toBe(expected);
  });

  it('shows kobo digits when asked', () => {
    expect(formatKobo(450000, { alwaysShowKobo: true })).toBe('₦4,500.00');
  });

  it('handles the largest safe integer without losing precision', () => {
    expect(formatKobo(Number.MAX_SAFE_INTEGER)).toBe('₦90,071,992,547,409.91');
  });

  it.each([4500.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2])(
    'rejects non-integer kobo %p',
    (value) => {
      expect(() => formatKobo(value)).toThrow(TypeError);
    },
  );
});

describe('speakKobo', () => {
  it('reads naira and kobo for screen readers', () => {
    expect(speakKobo(450050)).toBe('4,500 naira 50 kobo');
    expect(speakKobo(450000)).toBe('4,500 naira');
    expect(speakKobo(-25000)).toBe('minus 250 naira');
  });
});
