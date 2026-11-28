/** Combining marks left after NFD (accents, Yoruba/Igbo under-dots). */
const COMBINING_MARKS = /[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]/g;

/**
 * Product slug from a title, the way the server would make one (3–60 characters):
 * "JAMB Physics Past Questions 2015–2025" → "jamb-physics-past-questions-2015-2025".
 */
export function slugify(title: string, max = 60): string {
  let s = title
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/['’‘`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > max)
    s = s
      .slice(0, max)
      .replace(/-[^-]*$/, '')
      .replace(/-+$/, '');
  return s.length >= 3 ? s : `${s}-item`.replace(/^-/, '');
}
