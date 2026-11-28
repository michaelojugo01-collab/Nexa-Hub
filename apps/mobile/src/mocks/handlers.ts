import type { ApiErrorBody } from '@nexa/api-contract';

import type { MockServerOptions } from './auth/server';
import { MockAuthServer } from './auth/server';
import { categories, discoverHome, discoverHomeEmpty, findStore, products } from './fixtures';

export type MockScenario = 'default' | 'empty';

export type MockResponse = { status: number; body: unknown };

export type MockFlags = { smsDown: boolean; rateLimited: boolean };

type Ctx = {
  params: Record<string, string>;
  query: Map<string, string>;
  scenario: MockScenario;
  body: Record<string, unknown>;
  authorization: string | undefined;
  flags: MockFlags;
  server: MockAuthServer;
};

type Handler = (ctx: Ctx) => MockResponse | Promise<MockResponse>;

const ok = (body: unknown): MockResponse => ({ status: 200, body });
const error = (status: number, body: ApiErrorBody): MockResponse => ({ status, body });

/** Opaque cursor, like the real API. Encodes the offset of the next item. */
const encodeCursor = (offset: number) => `cur_${offset.toString(36)}`;
const decodeCursor = (cursor: string) =>
  cursor.startsWith('cur_') ? parseInt(cursor.slice(4), 36) : NaN;

function paginate<T>(all: T[], query: Map<string, string>, defaultLimit: number): MockResponse {
  const limit = Number(query.get('limit') ?? defaultLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return error(400, { code: 'VALIDATION_ERROR', message: 'limit must be between 1 and 50.' });
  }
  const cursor = query.get('cursor');
  const offset = cursor ? decodeCursor(cursor) : 0;
  if (Number.isNaN(offset)) {
    return error(400, { code: 'VALIDATION_ERROR', message: 'Invalid cursor.' });
  }
  const data = all.slice(offset, offset + limit);
  const next = offset + limit;
  return ok({ data, nextCursor: next < all.length ? encodeCursor(next) : null });
}

const route = (method: string, path: string, handler: Handler) => {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/\{(\w+)\}/g, (_, key: string) => {
      keys.push(key);
      return '([^/]+)';
    })}$`,
  );
  return { method, pattern, keys, handler };
};

const routes = [
  // Auth
  route('POST', '/v1/auth/otp/request', ({ server, body, flags }) =>
    server.requestOtp(body, flags),
  ),
  route('POST', '/v1/auth/otp/verify', ({ server, body, flags }) => server.verifyOtp(body, flags)),
  route('POST', '/v1/auth/refresh', ({ server, body }) => server.refresh(body)),
  route('POST', '/v1/auth/logout', ({ server, body }) => server.logout(body)),

  // Me
  route('GET', '/v1/me', ({ server, authorization }) => server.getMe(authorization)),
  route('PATCH', '/v1/me', ({ server, authorization, body }) =>
    server.updateMe(authorization, body),
  ),
  route('DELETE', '/v1/me', ({ server, authorization, body }) =>
    server.deleteMe(authorization, body),
  ),
  route('POST', '/v1/me/seller', ({ server, authorization }) => server.becomeSeller(authorization)),
  route('POST', '/v1/me/email/verification', ({ server, authorization }) =>
    server.sendEmailVerification(authorization),
  ),
  route('GET', '/v1/me/data-export', ({ server, authorization }) =>
    server.getDataExport(authorization),
  ),
  route('POST', '/v1/me/data-export', ({ server, authorization }) =>
    server.requestDataExport(authorization),
  ),
  route('GET', '/v1/usernames/availability', ({ server, authorization, query }) =>
    server.checkUsername(authorization, query.get('username') ?? ''),
  ),

  // Discovery
  route('GET', '/v1/discover/home', ({ scenario }) =>
    ok(scenario === 'empty' ? discoverHomeEmpty : discoverHome),
  ),
  route('GET', '/v1/discover/categories', ({ query, scenario }) =>
    paginate(scenario === 'empty' ? [] : categories, query, 50),
  ),
  route('GET', '/v1/stores/{slug}', ({ params }) => {
    const store = findStore(params.slug ?? '');
    return store
      ? ok(store)
      : error(404, { code: 'NOT_FOUND', message: 'We couldn’t find that store.' });
  }),
  route('GET', '/v1/products', ({ query, scenario }) => {
    const storeSlug = query.get('storeSlug');
    if (storeSlug && !findStore(storeSlug)) {
      return error(404, { code: 'NOT_FOUND', message: 'We couldn’t find that store.' });
    }
    const all =
      scenario === 'empty' ? [] : products.filter((p) => !storeSlug || p.store.slug === storeSlug);
    return paginate(all, query, 20);
  }),
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

export type MockRequest = {
  method: string;
  url: string;
  body?: Record<string, unknown>;
  authorization?: string;
};

/** Finds the handler for a request and runs it. Unknown routes return 404 like the real API. */
export async function handleMockRequest(
  request: MockRequest,
  options: { server: MockAuthServer; scenario?: MockScenario; flags?: MockFlags },
): Promise<MockResponse> {
  const { pathname, query } = parseUrl(request.url);
  for (const r of routes) {
    if (r.method !== request.method) continue;
    const match = r.pattern.exec(pathname);
    if (!match) continue;
    const params = Object.fromEntries(
      r.keys.map((key, i) => [key, decodeURIComponent(match[i + 1] ?? '')]),
    );
    return r.handler({
      params,
      query,
      scenario: options.scenario ?? 'default',
      body: request.body ?? {},
      authorization: request.authorization,
      flags: options.flags ?? { smsDown: false, rateLimited: false },
      server: options.server,
    });
  }
  return error(404, { code: 'NOT_FOUND', message: `No mock for ${request.method} ${pathname}` });
}

export function createMockServer(options: MockServerOptions) {
  return new MockAuthServer(options);
}
