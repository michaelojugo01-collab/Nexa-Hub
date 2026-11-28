import type { FetchLike } from '@nexa/api-contract';

import { MockAuthServer } from './auth/server';
import { memoryPersistence } from './persistence';
import { handleMockRequest, type MockFlags, type MockScenario } from './handlers';
import { MockProductServer } from './products/server';
import { MockStoreServer } from './stores/server';

export type MockFetchOptions = {
  /** Artificial latency per request, so loading states are visible. */
  delayMs?: number;
  /** 0–1. Share of requests that fail with a 500, so error states are visible. */
  failureRate?: number;
  scenario?: MockScenario;
  /** The fake backend. Defaults to a fresh in-memory one (handy for tests). */
  server?: MockAuthServer;
  /** The fake stores backend. Defaults to an in-memory one tied to `server`. */
  stores?: MockStoreServer;
  /** The fake products backend (F4). Defaults to an in-memory one tied to the others. */
  products?: MockProductServer;
  /** Read on every request so the Dev settings toggles apply immediately. */
  getFlags?: () => MockFlags & { offline: boolean };
  /** Injected for deterministic tests. */
  random?: () => number;
};

const wait = (ms: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    if (ms <= 0) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    });
  });

const json = (status: number, body: unknown) =>
  new Response(status === 204 || body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function header(init: RequestInit, name: string) {
  const headers = init.headers as Record<string, string> | undefined;
  return headers?.[name];
}

/** A fetch replacement that answers from fixtures and the mock auth server. */
export function createMockFetch({
  delayMs = 0,
  failureRate = 0,
  scenario = 'default',
  server = new MockAuthServer({ persistence: memoryPersistence(), accessTokenTtlSec: 900 }),
  getFlags = () => ({ smsDown: false, rateLimited: false, offline: false }),
  stores,
  products,
  random = Math.random,
}: MockFetchOptions = {}): FetchLike {
  const storeServer =
    stores ?? new MockStoreServer({ auth: server, persistence: memoryPersistence() });
  const productServer =
    products ??
    new MockProductServer({ auth: server, stores: storeServer, persistence: memoryPersistence() });
  return async (url, init) => {
    await wait(delayMs, init.signal);
    const flags = getFlags();

    // Like a real fetch with no network: reject instead of responding.
    if (flags.offline) throw new TypeError('Network request failed');

    if (random() < failureRate) {
      return json(500, {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again.',
      });
    }

    const body =
      typeof init.body === 'string'
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined;
    const { status, body: responseBody } = await handleMockRequest(
      { method: init.method ?? 'GET', url, body, authorization: header(init, 'Authorization') },
      { server, stores: storeServer, products: productServer, scenario, flags },
    );
    return json(status, responseBody);
  };
}
