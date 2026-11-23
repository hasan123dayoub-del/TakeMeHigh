/**
 * Typed fetch wrapper for the TakeMeHigh API.
 *
 * - Base URL from NEXT_PUBLIC_API_URL (default http://localhost:3001/api).
 * - Sends the access token; on 401 it refreshes ONCE (single-flight across concurrent calls) with the
 *   rotating refresh token and retries the request. If refreshing fails the session is cleared and
 *   the auth provider sends the user to /login.
 * - Non-2xx responses throw `ApiError`, mirroring the API's error shape
 *   `{ statusCode, error, message, path, timestamp }`.
 *
 * Token storage: localStorage (hackathon trade-off, documented). Any XSS on this origin could read
 * it; production should move the refresh token to an httpOnly SameSite cookie set by the API.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

const ACCESS_KEY = 'takemehigh.access';
const REFRESH_KEY = 'takemehigh.refresh';

function read(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode): session lasts for this tab only */
  }
}

export const tokenStore = {
  get: () => read(ACCESS_KEY),
  getRefresh: () => read(REFRESH_KEY),
  set(accessToken: string, refreshToken?: string) {
    write(ACCESS_KEY, accessToken);
    if (refreshToken) write(REFRESH_KEY, refreshToken);
  },
  clear() {
    write(ACCESS_KEY, null);
    write(REFRESH_KEY, null);
  },
  /** localStorage keys, for cross-tab `storage` events */
  keys: [ACCESS_KEY, REFRESH_KEY] as const,
};

/** The API's error body. `message` is an array for validation errors. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly messages: string[];
  readonly path?: string;
  readonly timestamp?: string;

  constructor(body: Partial<ApiErrorBody> & { statusCode: number }) {
    const messages = Array.isArray(body.message) ? body.message : body.message ? [body.message] : ['Something went wrong. Please try again.'];
    super(messages[0]);
    this.name = 'ApiError';
    this.status = body.statusCode;
    this.code = body.error ?? 'Error';
    this.messages = messages;
    this.path = body.path;
    this.timestamp = body.timestamp;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isConflict() {
    return this.status === 409;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

/** Human-readable message for any thrown value (toasts and inline errors). API messages are shown verbatim. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  if (err instanceof ApiError) return err.messages.join(' ');
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
const tokenListeners = new Set<Listener>();

/** "Session expired / revoked" events. Returns an unsubscribe fn. */
export function onUnauthorized(listener: Listener) {
  unauthorizedListeners.add(listener);
  return () => void unauthorizedListeners.delete(listener);
}
/** Token changed (login, refresh, logout). */
export function onTokenChange(listener: Listener) {
  tokenListeners.add(listener);
  return () => void tokenListeners.delete(listener);
}
export const emitTokenChange = () => tokenListeners.forEach((l) => l());

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Query;
  /** Skip the bearer token (login, public pages). */
  anonymous?: boolean;
  /** Return the raw Response (downloads). */
  raw?: boolean;
}

export function buildUrl(path: string, query?: Query) {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

// ------------------------------------------------------------------ refresh (single flight)

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      tokenStore.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

function sessionEnded() {
  tokenStore.clear();
  emitTokenChange();
  unauthorizedListeners.forEach((l) => l());
}

// ------------------------------------------------------------------ fetch

export async function apiFetch<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { body, query, anonymous, raw, headers, ...init } = options;
  const token = anonymous ? null : tokenStore.get();

  const h = new Headers(headers);
  h.set('Accept', raw ? '*/*' : 'application/json');
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) h.set('Content-Type', 'application/json');
  if (token) h.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      ...init,
      headers: h,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({ statusCode: 0, error: 'Network Error', message: 'NETWORK' });
  }

  if (res.status === 401 && token && !retried) {
    if (await refreshTokens()) return apiFetch<T>(path, options, true);
    sessionEnded();
  }

  if (raw && res.ok) return res as unknown as T;
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const errBody =
      data && typeof data === 'object' && 'statusCode' in data
        ? (data as ApiErrorBody)
        : { statusCode: res.status, error: res.statusText, message: typeof data === 'string' ? data : undefined };
    throw new ApiError(errBody);
  }
  return data as T;
}

type NoBody = Omit<RequestOptions, 'body' | 'method'>;

export const api = {
  get: <T>(path: string, options?: NoBody) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: NoBody) => apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: NoBody) => apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: NoBody) => apiFetch<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: NoBody) => apiFetch<T>(path, { ...options, method: 'DELETE' }),

  /** Download a file (e.g. Excel report) with auth, then save it in the browser. */
  async download(path: string, query: Query, fallbackName: string) {
    const res = await apiFetch<Response>(path, { method: 'GET', query, raw: true });
    const disposition = res.headers.get('content-disposition') ?? '';
    const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? fallbackName;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
