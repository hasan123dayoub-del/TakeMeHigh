/**
 * Typed fetch wrapper for the TravelOS API.
 *
 * - Base URL from NEXT_PUBLIC_API_URL (default http://localhost:3001/api).
 * - Sends the bearer token from client storage.
 * - Non-2xx responses throw `ApiError`, mirroring the API's single error shape
 *   `{ statusCode, error, message, path, timestamp }`.
 * - A 401 on an authenticated request clears the session and notifies the auth
 *   provider, which redirects to /login.
 *
 * Token storage: localStorage (hackathon trade-off). It survives reloads and is
 * simple, but any XSS on this origin could read it. Production should move to an
 * httpOnly, SameSite=strict cookie set by the API plus CSRF protection.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(
  /\/+$/,
  '',
);

const TOKEN_KEY = 'travelos.token';

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode): session lasts for this tab only */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
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
    const messages = Array.isArray(body.message)
      ? body.message
      : body.message
        ? [body.message]
        : ['Something went wrong. Please try again.'];
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
  get isNetwork() {
    return this.status === 0;
  }
}

/** Human-readable message for any thrown value (for toasts and inline errors). */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  if (err instanceof ApiError) return err.messages.join(' ');
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to "session expired / revoked" events. Returns an unsubscribe fn. */
export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Query;
  /** Skip the bearer token (e.g. login). */
  anonymous?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, anonymous, headers, ...init } = options;
  const token = anonymous ? null : tokenStore.get();

  const h = new Headers(headers);
  h.set('Accept', 'application/json');
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
    throw new ApiError({
      statusCode: 0,
      error: 'Network Error',
      message: 'Cannot reach the TravelOS server. Check your connection and try again.',
    });
  }

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
        : {
            statusCode: res.status,
            error: res.statusText,
            message: typeof data === 'string' ? data : undefined,
          };
    const error = new ApiError(errBody);
    if (error.isUnauthorized && token) {
      tokenStore.clear();
      unauthorizedListeners.forEach((l) => l());
    }
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
