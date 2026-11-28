import type { ApiErrorBody } from '@nexa/api-contract';

import { discoverHome, discoverHomeEmpty, findStore, meBuyer, products } from './fixtures';

export type MockScenario = 'default' | 'empty';

export type MockResponse = { status: number; body: unknown };

type Handler = (ctx: {
  params: Record<string, string>;
  query: Map<string, string>;
  scenario: MockScenario;
}) => MockResponse;

const ok = (body: unknown): MockResponse => ({ status: 200, body });
const error = (status: number, body: ApiErrorBody): MockResponse => ({ status, body });

/** Opaque cursor, like the real API. Encodes the offset of the next item. */
const encodeCursor = (offset: number) => `cur_${offset.toString(36)}`;
const decodeCursor = (cursor: string) =>
  cursor.startsWith('cur_') ? parseInt(cursor.slice(4), 36) : NaN;

const routes: { method: string; pattern: RegExp; keys: string[]; handler: Handler }[] = [
  {
    method: 'GET',
    pattern: /^\/v1\/me$/,
    keys: [],
    handler: () => ok(meBuyer),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/discover\/home$/,
    keys: [],
    handler: ({ scenario }) => ok(scenario === 'empty' ? discoverHomeEmpty : discoverHome),
  },
  {
    method: 'GET',
    pattern: /^\/v1\/stores\/([^/]+)$/,
    keys: ['slug'],
    handler: ({ params }) => {
      const store = findStore(params.slug ?? '');
      return store
        ? ok(store)
        : error(404, { code: 'NOT_FOUND', message: 'We couldn’t find that store.' });
    },
  },
  {
    method: 'GET',
    pattern: /^\/v1\/products$/,
    keys: [],
    handler: ({ query, scenario }) => {
      const limit = Number(query.get('limit') ?? 20);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return error(400, { code: 'VALIDATION_ERROR', message: 'limit must be between 1 and 50.' });
      }
      const storeSlug = query.get('storeSlug');
      if (storeSlug && !findStore(storeSlug)) {
        return error(404, { code: 'NOT_FOUND', message: 'We couldn’t find that store.' });
      }
      const cursor = query.get('cursor');
      const offset = cursor ? decodeCursor(cursor) : 0;
      if (Number.isNaN(offset)) {
        return error(400, { code: 'VALIDATION_ERROR', message: 'Invalid cursor.' });
      }

      const all =
        scenario === 'empty'
          ? []
          : products.filter((p) => !storeSlug || p.store.slug === storeSlug);
      const data = all.slice(offset, offset + limit);
      const next = offset + limit;
      return ok({ data, nextCursor: next < all.length ? encodeCursor(next) : null });
    },
  },
];

/**
 * Minimal URL parsing. React Native's built-in URL class does not fully implement
 * pathname/searchParams, so we don't rely on it.
 */
function parseUrl(url: string) {
  const withoutOrigin = url.replace(/^[a-z]+:\/\/[^/]+/i, '');
  const [pathname = '/', search = ''] = withoutOrigin.split('?');
  const query = new Map<string, string>();
  for (const pair of search.split('&')) {
    if (!pair) continue;
    const [key = '', value = ''] = pair.split('=');
    query.set(decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, ' ')));
  }
  return { pathname, query };
}

/** Finds the handler for a request and runs it. Unknown routes return 404 like the real API. */
export function handleMockRequest(
  method: string,
  url: string,
  scenario: MockScenario = 'default',
): MockResponse {
  const { pathname, query } = parseUrl(url);
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    const params = Object.fromEntries(
      route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1] ?? '')]),
    );
    return route.handler({ params, query, scenario });
  }
  return error(404, { code: 'NOT_FOUND', message: `No mock for ${method} ${pathname}` });
}
