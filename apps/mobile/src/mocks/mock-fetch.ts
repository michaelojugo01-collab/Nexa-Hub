import type { FetchLike } from '@nexa/api-contract';

import { handleMockRequest, type MockScenario } from './handlers';

export type MockFetchOptions = {
  /** Artificial latency per request, so loading states are visible. */
  delayMs?: number;
  /** 0–1. Share of requests that fail with a 500, so error states are visible. */
  failureRate?: number;
  scenario?: MockScenario;
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
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** A fetch replacement that answers from fixtures. Plugged into the API client in mock mode. */
export function createMockFetch({
  delayMs = 0,
  failureRate = 0,
  scenario = 'default',
  random = Math.random,
}: MockFetchOptions = {}): FetchLike {
  return async (url, init) => {
    await wait(delayMs, init.signal);

    if (random() < failureRate) {
      return json(500, {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again.',
      });
    }

    const { status, body } = handleMockRequest(init.method ?? 'GET', url, scenario);
    return json(status, body);
  };
}
