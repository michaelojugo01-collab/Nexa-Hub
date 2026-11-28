import { storeBioSchema, storeFormSchema, slugSchema, STORE_BIO_MAX } from '../schemas';
import { isValidSlug, normalizeSlugInput, slugProblem, suggestSlug } from '../slug';

describe('suggestSlug', () => {
  it.each([
    ['Adaeze Prints', 'adaeze-prints'],
    ['  Bisi   Bakes  ', 'bisi-bakes'],
    ['BEATS BY TOBI', 'beats-by-tobi'],
    ['Kola Creates 🎨🔥', 'kola-creates'],
    ['🔥 Hot Deals 🔥', 'hot-deals'],
    ["Ọlá's Àdìrẹ & Ankara", 'olas-adire-and-ankara'],
    ['Adéwálé Ọ̀ṣọ́ Store', 'adewale-oso-store'],
    ['Ìyá Basírà Ọbẹ̀', 'iya-basira-obe'],
    ['Ụ̀gwụ̀ Ńkà', 'ugwu-nka'], // Igbo dots and accents
    ['Ɗan Ƙasa Ɓoyi', 'dan-kasa-boyi'], // Hausa hooked letters
    ['Wetin Dey Sup?!', 'wetin-dey-sup'], // Pidgin + punctuation
    ['Na Wa O!!!', 'na-wa-o'],
    ['Chop & Quench', 'chop-and-quench'],
    ['Mama-Put   ---  Express', 'mama-put-express'],
    ['Store 2.0', 'store-2-0'],
    ['A', 'a-store'],
    ['Ọ', 'o-store'],
    ['🔥🔥🔥', ''],
    ['', ''],
  ])('%j → %j', (name, slug) => {
    expect(suggestSlug(name)).toBe(slug);
  });

  it('cuts long names to 30 characters at a word boundary', () => {
    const slug = suggestSlug('The Very Best Lagos Island Handmade Leather Sandals');
    expect(slug).toBe('the-very-best-lagos-island');
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(isValidSlug(slug)).toBe(true);
  });

  it('cuts one very long word mid-word', () => {
    const slug = suggestSlug('a'.repeat(50));
    expect(slug).toBe('a'.repeat(30));
  });

  it('always produces a valid slug or nothing', () => {
    for (const name of ['x', '-- --', 'Ọ̀ṣọ́ & Àṣẹ', '👩🏾‍🎨 Art', 'ab', 'a b']) {
      const slug = suggestSlug(name);
      if (slug) expect(isValidSlug(slug)).toBe(true);
    }
  });
});

describe('slugProblem', () => {
  it.each([
    ['adaezeprints', null],
    ['abc', null],
    ['a1-b2', null],
    ['a'.repeat(30), null],
    ['', 'empty'],
    ['ab', 'too-short'],
    ['a'.repeat(31), 'too-long'],
    ['Adaeze', 'characters'],
    ['ada eze', 'characters'],
    ['ada_eze', 'characters'],
    ['adaèze', 'characters'],
    ['ada🔥', 'characters'],
    ['-adaeze', 'hyphens'],
    ['adaeze-', 'hyphens'],
    ['ada--eze', 'hyphens'],
  ])('%j → %j', (slug, problem) => {
    expect(slugProblem(slug)).toBe(problem);
  });

  it('does not decide reserved words: the server does', () => {
    expect(slugProblem('admin')).toBeNull();
    expect(slugProblem('davido')).toBeNull();
  });
});

describe('normalizeSlugInput', () => {
  it.each([
    ['Bisi Bakes', 'bisi-bakes'],
    ['bisi-', 'bisi-'], // keeps the hyphen while typing
    ['bisi--bakes', 'bisi-bakes'],
    ['-bisi', 'bisi'],
    ['Àdìrẹ', 'adire'],
    ['bisi_bakes!', 'bisibakes'],
    ['x'.repeat(40), 'x'.repeat(30)],
  ])('%j → %j', (input, out) => {
    expect(normalizeSlugInput(input)).toBe(out);
  });
});

describe('store schemas', () => {
  it(`allows a bio of exactly ${STORE_BIO_MAX} characters and refuses ${STORE_BIO_MAX + 1}`, () => {
    expect(storeBioSchema.safeParse('a'.repeat(150)).success).toBe(true);
    const over = storeBioSchema.safeParse('a'.repeat(151));
    expect(over.success).toBe(false);
    expect(over.error?.issues[0]?.message).toBe('Your bio can be up to 150 characters');
  });

  it('counts the trimmed bio, and an empty bio is fine', () => {
    expect(storeBioSchema.safeParse(`  ${'a'.repeat(150)}  `).success).toBe(true);
    expect(storeBioSchema.safeParse('').success).toBe(true);
  });

  it('counts emoji and accented letters as characters', () => {
    expect(storeBioSchema.safeParse('Ọ'.repeat(150)).success).toBe(true);
  });

  it('gives a readable message for each slug problem', () => {
    expect(slugSchema.safeParse('ab').error?.issues[0]?.message).toBe('Use at least 3 characters.');
    expect(slugSchema.safeParse('Bisi').error?.issues[0]?.message).toBe(
      'Use only lowercase letters, numbers and hyphens.',
    );
  });

  it('needs a name, a valid slug and a category', () => {
    const result = storeFormSchema.safeParse({ name: ' ', slug: 'x', categorySlug: '', bio: '' });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['name', 'slug', 'categorySlug']));
    expect(
      storeFormSchema.safeParse({
        name: 'Bisi Bakes',
        slug: 'bisibakes',
        categorySlug: 'food',
        bio: '',
      }).success,
    ).toBe(true);
  });
});
