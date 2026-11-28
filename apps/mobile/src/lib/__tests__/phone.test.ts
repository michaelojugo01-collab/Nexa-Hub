import { formatNigerianPhone, normaliseNigerianPhone } from '../phone';

describe('normaliseNigerianPhone', () => {
  it.each([
    ['08031234567', '+2348031234567'],
    ['0803 123 4567', '+2348031234567'],
    ['0803-123-4567', '+2348031234567'],
    ['(0803) 123.4567', '+2348031234567'],
    ['8031234567', '+2348031234567'],
    ['803 123 4567', '+2348031234567'],
    ['+2348031234567', '+2348031234567'],
    ['+234 803 123 4567', '+2348031234567'],
    ['2348031234567', '+2348031234567'],
    ['+2340803 123 4567', '+2348031234567'],
    ['07061234567', '+2347061234567'],
    ['07121234567', '+2347121234567'],
    ['08151234567', '+2348151234567'],
    ['09061234567', '+2349061234567'],
    ['09121234567', '+2349121234567'],
    [' 0803 123 4567 ', '+2348031234567'],
  ])('%s → %s', (input, expected) => {
    expect(normaliseNigerianPhone(input)).toEqual({ ok: true, e164: expected });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['0803123456', 'invalid'], // 10 digits with trunk 0
    ['080312345678', 'invalid'], // 12 digits
    ['06031234567', 'invalid'], // 60x is not mobile
    ['08231234567', 'invalid'], // 82x is not allocated to mobile
    ['01234567890', 'invalid'], // landline
    ['+447911123456', 'invalid'], // UK number
    ['+1 803 123 4567', 'invalid'],
    ['0803abc4567', 'invalid'],
    ['0803+1234567', 'invalid'],
    ['++2348031234567', 'invalid'],
  ])('rejects %p as %s', (input, reason) => {
    expect(normaliseNigerianPhone(input)).toEqual({ ok: false, reason });
  });
});

describe('formatNigerianPhone', () => {
  it('groups an E.164 number for display', () => {
    expect(formatNigerianPhone('+2348031234567')).toBe('+234 803 123 4567');
  });
});
