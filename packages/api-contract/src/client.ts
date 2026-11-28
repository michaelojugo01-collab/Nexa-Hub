import type { components, operations } from './generated/schema';

export type Schemas = components['schemas'];
export type ApiErrorBody = Schemas['Error'];
export type Money = Schemas['Money'];
export type Me = Schemas['Me'];
export type MeUpdate = Schemas['MeUpdate'];
export type Role = Schemas['Role'];
export type StoreSummary = Schemas['StoreSummary'];
export type Store = Schemas['Store'];
export type OwnStore = Schemas['OwnStore'];
export type StoreVisibility = Schemas['StoreVisibility'];
export type StoreCreate = Schemas['StoreCreate'];
export type StoreUpdate = Schemas['StoreUpdate'];
export type ImageVariants = Schemas['ImageVariants'];
export type SlugAvailability = Schemas['SlugAvailability'];
export type FollowState = Schemas['FollowState'];
export type UploadKind = Schemas['UploadKind'];
export type UploadRequest = Schemas['UploadRequest'];
export type UploadTicket = Schemas['UploadTicket'];
export type ProductSummary = Schemas['ProductSummary'];
export type ProductPage = Schemas['ProductPage'];
export type Product = Schemas['Product'];
export type ContentMode = Schemas['ContentMode'];
export type ProductState = Schemas['ProductState'];
export type ProductVisibility = Schemas['ProductVisibility'];
export type ProductTypeDef = Schemas['ProductTypeDef'];
export type FileRules = Schemas['FileRules'];
export type Tag = Schemas['Tag'];
export type FeePreview = Schemas['FeePreview'];
export type AssetKind = Schemas['AssetKind'];
export type AssetStatus = Schemas['AssetStatus'];
export type ProductAsset = Schemas['ProductAsset'];
export type ProductPreview = Schemas['ProductPreview'];
export type OwnProduct = Schemas['OwnProduct'];
export type OwnProductPage = Schemas['OwnProductPage'];
export type ProductCreate = Schemas['ProductCreate'];
export type ProductUpdate = Schemas['ProductUpdate'];
export type UploadStart = Schemas['UploadStart'];
export type MultipartUpload = Schemas['MultipartUpload'];
export type CompletedPart = Schemas['CompletedPart'];
export type PublicProfile = Schemas['PublicProfile'];
export type SitemapEntry = Schemas['SitemapEntry'];
export type SitemapPage = Schemas['SitemapPage'];
export type DiscoverHome = Schemas['DiscoverHome'];
export type Category = Schemas['Category'];
export type CategoryPage = Schemas['CategoryPage'];
export type OtpChannel = Schemas['OtpChannel'];
export type OtpRequest = Schemas['OtpRequest'];
export type OtpChallenge = Schemas['OtpChallenge'];
export type OtpVerifyRequest = Schemas['OtpVerifyRequest'];
export type TokenPair = Schemas['TokenPair'];
export type AuthSession = Schemas['AuthSession'];
export type UsernameAvailability = Schemas['UsernameAvailability'];
export type EmailVerificationSent = Schemas['EmailVerificationSent'];
export type AccountDeletion = Schemas['AccountDeletion'];
export type DataExport = Schemas['DataExport'];
export type ListProductsQuery = NonNullable<operations['listProducts']['parameters']['query']>;
export type ListCategoriesQuery = NonNullable<operations['listCategories']['parameters']['query']>;

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

  /** True when there was no HTTP response at all (offline, timeout). */
  get isNetworkError() {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Session hooks. The client never stores tokens itself; the app owns storage.
 * On a 401 the client calls `refresh` once (concurrent 401s share one refresh),
 * then retries the original request once with the new token.
 */
export type AuthHandlers = {
  /** The current access token, or null when signed out. */
  getAccessToken: () => string | null | Promise<string | null>;
  /**
   * Get a new access token. Return it on success; return null when the session is over
   * (the client then calls `onSessionEnded`). Throw an ApiError with status 0 for network
   * problems: the session is kept and the original error is surfaced.
   */
  refresh: () => Promise<string | null>;
  /** Called once when a refresh is refused. The app signs the user out. */
  onSessionEnded: () => void;
};

export type ApiClientOptions = {
  /** e.g. https://api.nexahub.ng — no trailing slash */
  baseUrl: string;
  /** Injected so tests and mock mode can answer requests without a network. */
  fetch?: FetchLike;
  auth?: AuthHandlers;
  timeoutMs?: number;
};

type Query = Record<string, string | number | boolean | undefined>;
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type RequestOptions = {
  query?: Query;
  body?: unknown;
  /** Public endpoints that must not trigger a refresh (auth endpoints themselves). */
  skipAuth?: boolean;
};

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

const invalidResponse = {
  code: ClientErrorCode.INVALID_RESPONSE,
  message: 'Something went wrong.',
};

/** Thin typed client over the generated OpenAPI types. One method per operation. */
export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, auth, timeoutMs = 15_000 } = options;
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init));

  let refreshing: Promise<string | null> | null = null;

  /** One refresh at a time: concurrent 401s wait for the same promise. */
  function refreshOnce() {
    if (!auth) return Promise.resolve(null);
    refreshing ??= auth.refresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function send(method: Method, path: string, opts: RequestOptions, token: string | null) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      return await doFetch(buildUrl(baseUrl, path, opts.query), {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
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
  }

  async function parse<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new ApiError(response.status, isErrorBody(body) ? body : invalidResponse);
    }
    if (body === undefined) throw new ApiError(response.status, invalidResponse);
    return body as T;
  }

  async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
    const useAuth = !!auth && !opts.skipAuth;
    const token = useAuth ? ((await auth.getAccessToken()) ?? null) : null;
    const response = await send(method, path, opts, token);

    if (response.status !== 401 || !useAuth) return parse<T>(response);

    // 401: refresh once (shared by concurrent requests), then retry once.
    const fresh = await refreshOnce(); // network errors propagate; session is kept
    if (!fresh) {
      auth.onSessionEnded();
      return parse<T>(response);
    }
    const retried = await send(method, path, opts, fresh);
    if (retried.status === 401) auth.onSessionEnded();
    return parse<T>(retried);
  }

  return {
    // Auth (public; never trigger a refresh)
    requestOtp: (body: OtpRequest) =>
      request<OtpChallenge>('POST', '/v1/auth/otp/request', { body, skipAuth: true }),
    verifyOtp: (body: OtpVerifyRequest) =>
      request<AuthSession>('POST', '/v1/auth/otp/verify', { body, skipAuth: true }),
    refreshSession: (body: { refreshToken: string; deviceId: string }) =>
      request<TokenPair>('POST', '/v1/auth/refresh', { body, skipAuth: true }),
    logout: (body: { refreshToken: string }) =>
      request<void>('POST', '/v1/auth/logout', { body, skipAuth: true }),

    // Me
    getMe: () => request<Me>('GET', '/v1/me'),
    updateMe: (body: MeUpdate) => request<Me>('PATCH', '/v1/me', { body }),
    becomeSeller: () => request<Me>('POST', '/v1/me/seller'),
    deleteMe: () =>
      request<AccountDeletion>('DELETE', '/v1/me', { body: { confirmation: 'DELETE' } }),
    sendEmailVerification: () =>
      request<EmailVerificationSent>('POST', '/v1/me/email/verification'),
    getDataExport: () => request<DataExport>('GET', '/v1/me/data-export'),
    requestDataExport: () => request<DataExport>('POST', '/v1/me/data-export'),
    checkUsername: (username: string) =>
      request<UsernameAvailability>('GET', '/v1/usernames/availability', { query: { username } }),

    // Discovery
    getDiscoverHome: () => request<DiscoverHome>('GET', '/v1/discover/home'),
    listCategories: (query: ListCategoriesQuery = {}) =>
      request<CategoryPage>('GET', '/v1/discover/categories', { query }),

    // Stores
    getStore: (slug: string) => request<Store>('GET', `/v1/stores/${encodeURIComponent(slug)}`),
    getMyStore: () => request<OwnStore>('GET', '/v1/me/store'),
    createStore: (body: StoreCreate) => request<OwnStore>('POST', '/v1/stores', { body }),
    updateStore: (body: StoreUpdate) => request<OwnStore>('PATCH', '/v1/stores', { body }),
    checkSlug: (slug: string) =>
      request<SlugAvailability>('GET', '/v1/slugs/availability', { query: { slug } }),
    requestStoreUpload: (body: UploadRequest) =>
      request<UploadTicket>('POST', '/v1/me/store/uploads', { body }),
    followStore: (storeId: string) =>
      request<FollowState>('POST', `/v1/stores/${encodeURIComponent(storeId)}/follow`),
    unfollowStore: (storeId: string) =>
      request<FollowState>('DELETE', `/v1/stores/${encodeURIComponent(storeId)}/follow`),

    listProducts: (query: ListProductsQuery = {}) =>
      request<ProductPage>('GET', '/v1/products', { query }),

    // Public web (F3)
    getPublicProduct: (storeSlug: string, productSlug: string) =>
      request<Product>(
        'GET',
        `/v1/stores/${encodeURIComponent(storeSlug)}/products/${encodeURIComponent(productSlug)}`,
      ),
    getPublicProfile: (username: string) =>
      request<PublicProfile>('GET', `/v1/users/${encodeURIComponent(username)}`),
    listSitemap: (query: { cursor?: string; limit?: number } = {}) =>
      request<SitemapPage>('GET', '/v1/sitemap', { query }),

    // Products (F4)
    listProductTypes: () =>
      request<{ data: ProductTypeDef[]; nextCursor: string | null }>('GET', '/v1/product-types'),
    listTags: (q = '', limit = 10) =>
      request<{ data: Tag[]; nextCursor: string | null }>('GET', '/v1/tags', {
        query: { q: q || undefined, limit },
      }),
    previewFee: (priceKobo: number) =>
      request<FeePreview>('GET', '/v1/fees/preview', { query: { priceKobo } }),
    listMyProducts: (query: { state?: ProductState; cursor?: string; limit?: number } = {}) =>
      request<OwnProductPage>('GET', '/v1/products', { query: { owner: 'me', ...query } }),
    createProduct: (body: ProductCreate) => request<OwnProduct>('POST', '/v1/products', { body }),
    getOwnProduct: (id: string) =>
      request<OwnProduct>('GET', `/v1/products/${encodeURIComponent(id)}`),
    updateProduct: (id: string, body: ProductUpdate) =>
      request<OwnProduct>('PATCH', `/v1/products/${encodeURIComponent(id)}`, { body }),
    startProductUpload: (id: string, body: UploadStart) =>
      request<MultipartUpload>('POST', `/v1/products/${encodeURIComponent(id)}/uploads`, {
        body,
      }),
    completeProductUpload: (id: string, uploadId: string, parts: CompletedPart[]) =>
      request<ProductAsset>(
        'POST',
        `/v1/products/${encodeURIComponent(id)}/uploads/${encodeURIComponent(uploadId)}/complete`,
        { body: { parts } },
      ),
    abortProductUpload: (id: string, uploadId: string) =>
      request<void>(
        'DELETE',
        `/v1/products/${encodeURIComponent(id)}/uploads/${encodeURIComponent(uploadId)}`,
      ),
    publishProduct: (id: string, visibility: ProductVisibility) =>
      request<OwnProduct>('POST', `/v1/products/${encodeURIComponent(id)}/publish`, {
        body: { visibility },
      }),
    unpublishProduct: (id: string) =>
      request<OwnProduct>('POST', `/v1/products/${encodeURIComponent(id)}/unpublish`),
    republishProduct: (id: string) =>
      request<OwnProduct>('POST', `/v1/products/${encodeURIComponent(id)}/republish`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
