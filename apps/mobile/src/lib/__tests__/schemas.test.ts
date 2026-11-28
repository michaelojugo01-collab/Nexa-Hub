import { emailSchema, interestsSchema, phoneSchema, usernameSchema } from '../schemas';

describe('usernameSchema', () => {
  it.each(['ada', 'chidi_n', 'tunde2026', 'a_b_c', 'abcdefghijklmnopqrst'])('accepts %p', (u) => {
    expect(usernameSchema.safeParse(u).success).toBe(true);
  });

  it.each([
    ['ab', 'At least 3 characters'],
    ['abcdefghijklmnopqrstu', 'At most 20 characters'],
    ['2fast', 'Start with a letter'],
    ['_ada', 'Start with a letter'],
    ['Ada', 'Start with a letter'],
    ['ada.okafor', 'Use only lowercase letters, numbers and _'],
    ['ada okafor', 'Use only lowercase letters, numbers and _'],
    ['adaéze', 'Use only lowercase letters, numbers and _'],
  ])('rejects %p with "%s"', (u, message) => {
    const result = usernameSchema.safeParse(u);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain(message);
  });

  it('does not decide reserved names (the server does)', () => {
    expect(usernameSchema.safeParse('admin').success).toBe(true);
  });
});

describe('interestsSchema', () => {
  it('accepts zero to three interests', () => {
    expect(interestsSchema.safeParse([]).success).toBe(true);
    expect(interestsSchema.safeParse(['fashion']).success).toBe(true);
    expect(interestsSchema.safeParse(['fashion', 'tech', 'food']).success).toBe(true);
  });

  it('rejects a fourth interest', () => {
    const result = interestsSchema.safeParse(['fashion', 'tech', 'food', 'music']);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Choose up to 3');
  });

  it('rejects duplicates', () => {
    expect(interestsSchema.safeParse(['tech', 'tech']).success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('outputs E.164', () => {
    expect(phoneSchema.parse('0803 123 4567')).toBe('+2348031234567');
  });

  it('explains what is wrong', () => {
    expect(phoneSchema.safeParse('').error?.issues[0]?.message).toBe('Enter your phone number');
    expect(phoneSchema.safeParse('123').error?.issues[0]?.message).toMatch(/valid Nigerian/);
  });
});

describe('emailSchema', () => {
  it('trims and lowercases', () => {
    expect(emailSchema.parse('  Chidi@Example.COM ')).toBe('chidi@example.com');
  });

  it('rejects invalid addresses', () => {
    expect(emailSchema.safeParse('chidi@').success).toBe(false);
  });
});
