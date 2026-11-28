import type { components, operations } from './generated/schema';

export type Schemas = components['schemas'];
export type ApiErrorBody = Schemas['Error'];
export type Money = Schemas['Money'];
export type Me = Schemas['Me'];
export type StoreSummary = Schemas['StoreSummary'];
export type Store = Schemas['Store'];
export type ProductSummary = Schemas['ProductSummary'];
export type ProductType = Schemas['ProductType'];
export type ProductPage = Schemas['ProductPage'];
export type DiscoverHome = Schemas['DiscoverHome'];
export type ListProductsQuery = NonNullable<operations['listProducts']['parameters']['query']>;

/** Error codes the client itself produces (the server adds its own, e.g. NOT_FOUND). */
export const ClientErrorCode = {
  /** No response at all: offline, DNS failure, connection reset. */
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  /** The server answered with something that is not the `{ code, message }` shape. */
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const;

/** The only error type API calls throw. `status` is 0 when there was no HTTP response. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
  }

  /** True for failures worth retrying automatically (network, timeout, 5xx, 429). */
  get isRetryable() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export type ApiClientOptions = {
  /** e.g. https://api.nexahub.ng — no trailing slash */
  baseUrl: string;
  /** Injected so tests and mock mode can answer requests without a network. */
  fetch?: FetchLike;
  /** Returns the current access token, or null when signed out. */
  getAccessToken?: () => string | null | Promise<string | null>;
  timeoutMs?: number;
};

type Query = Record<string, string | number | boolean | undefined>;

function buildUrl(baseUrl: string, path: string, query?: Query) {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${baseUrl}${path}${params ? `?${params}` : ''}`;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).code === 'string' &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

/** Thin typed client over the generated OpenAPI types. One method per operation. */
export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, getAccessToken, timeoutMs = 15_000 } = options;
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init));

  async function get<T>(path: string, query?: Query): Promise<T> {
    const token = (await getAccessToken?.()) ?? null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await doFetch(buildUrl(baseUrl, path, query), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });
    } catch {
      throw controller.signal.aborted
        ? new ApiError(0, {
            code: ClientErrorCode.TIMEOUT,
            message: 'The request took too long. Please try again.',
          })
        : new ApiError(0, {
            code: ClientErrorCode.NETWORK_ERROR,
            message: 'We couldn’t reach Nexa Hub. Check your connection.',
          });
    } finally {
      clearTimeout(timer);
    }

    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new ApiError(
        response.status,
        isErrorBody(body)
          ? body
          : { code: ClientErrorCode.INVALID_RESPONSE, message: 'Something went wrong.' },
      );
    }
    if (body === undefined) {
      throw new ApiError(response.status, {
        code: ClientErrorCode.INVALID_RESPONSE,
        message: 'Something went wrong.',
      });
    }
    return body as T;
  }

  return {
    getMe: () => get<Me>('/v1/me'),
    getDiscoverHome: () => get<DiscoverHome>('/v1/discover/home'),
    getStore: (slug: string) => get<Store>(`/v1/stores/${encodeURIComponent(slug)}`),
    listProducts: (query: ListProductsQuery = {}) => get<ProductPage>('/v1/products', query),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
