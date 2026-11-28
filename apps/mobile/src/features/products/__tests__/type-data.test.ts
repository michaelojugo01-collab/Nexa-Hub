/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';

import { productTypes } from '@nexa/mocks';

/**
 * Types are data (GET /v1/product-types): no screen or hook may name a type or its code.
 * Content modes come from the contract enum; everything else comes from the type record.
 */
describe('product types come from data', () => {
  const dir = path.join(__dirname, '..');
  const sources = fs
    .readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes('__tests__'))
    .map((f) => ({ file: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));

  it('found the product feature files', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it.each(productTypes.map((t) => [t.code, t.name]))(
    'no screen code mentions %s (%s)',
    (code, name) => {
      const codePattern = new RegExp(`['"\`]${code}['"\`]`);
      for (const { file, text } of sources) {
        expect({ file, hasCode: codePattern.test(text), hasName: text.includes(name) }).toEqual({
          file,
          hasCode: false,
          hasName: false,
        });
      }
    },
  );

  it('every type maps to a content mode, a category and file rules in the data', () => {
    for (const t of productTypes) {
      expect(t.modes.length).toBeGreaterThan(0);
      expect(t.defaultCategorySlug).toBeTruthy();
      if (t.modes.some((m) => m !== 'LINK')) expect(t.files?.extensions.length).toBeGreaterThan(0);
    }
    expect(productTypes.map((t) => t.code).sort()).toEqual(
      ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'I4'].sort(),
    );
  });
});
