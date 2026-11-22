'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { can as canRole, type Permission, type Role } from '@travelos/shared';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { api, ApiError, onUnauthorized, tokenStore } from './api';
import type { Agency, AuthUser, LoginResponse } from './auth-types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  agency: Agency | null;
  role: Role | null;
  /** Error from GET /auth/me other than 401 (e.g. API unreachable). */
  error: ApiError | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: (opts?: { redirect?: boolean }) => void;
  /** Permission check for hiding UI. The API enforces the same rules server-side. */
  can: (permission: Permission) => boolean;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- token as an external store (no setState-in-effect, SSR-safe) ---------
const tokenListeners = new Set<() => void>();
function emitTokenChange() {
  tokenListeners.forEach((l) => l());
}
function subscribeToken(listener: () => void) {
  tokenListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === 'travelos.token') listener();
  };
  window.addEventListener('storage', onStorage); // sign-out in another tab
  return () => {
    tokenListeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
/** undefined = not known yet (server render / before hydration). */
const getServerToken = () => undefined;

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const token = useSyncExternalStore<string | null | undefined>(
    subscribeToken,
    tokenStore.get,
    getServerToken,
  );

  const me = useQuery({
    queryKey: [...ME_QUERY_KEY, token],
    queryFn: () => api.get<AuthUser>('/auth/me'),
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: (count, err) =>
      !(err instanceof ApiError && (err.isUnauthorized || err.isForbidden)) && count < 2,
  });

  // Session expired or revoked anywhere in the app -> back to sign-in.
  useEffect(
    () =>
      onUnauthorized(() => {
        queryClient.clear();
        emitTokenChange();
        toast.error('Your session has ended', { description: 'Please sign in again to continue.' });
      }),
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<LoginResponse>(
        '/auth/login',
        { email, password },
        { anonymous: true },
      );
      queryClient.setQueryData([...ME_QUERY_KEY, res.accessToken], res.user);
      tokenStore.set(res.accessToken);
      emitTokenChange();
      return res.user;
    },
    [queryClient],
  );

  const logout = useCallback(
    ({ redirect = true }: { redirect?: boolean } = {}) => {
      tokenStore.clear();
      queryClient.clear();
      emitTokenChange();
      if (redirect) router.replace('/login');
    },
    [queryClient, router],
  );

  const value = useMemo<AuthContextValue>(() => {
    let status: AuthStatus;
    let error: ApiError | null = null;
    if (token === undefined) status = 'loading';
    else if (token === null) status = 'unauthenticated';
    else if (me.data) status = 'authenticated';
    else if (me.isError) {
      const err = me.error instanceof ApiError ? me.error : new ApiError({ statusCode: 0 });
      status = err.isUnauthorized ? 'unauthenticated' : 'error';
      error = err;
    } else status = 'loading';

    const user = status === 'authenticated' ? (me.data ?? null) : null;
    const role = user?.role ?? null;
    return {
      status,
      user,
      agency: user?.agency ?? null,
      role,
      error,
      login,
      logout,
      can: (permission) => (role ? canRole(role, permission) : false),
      retry: () => void me.refetch(),
    };
  }, [token, me, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** `const canWrite = useCan('bookings.write')` */
export function useCan(permission: Permission) {
  return useAuth().can(permission);
}

/** Agency currency (ISO 4217) for money formatting; USD until the session loads. */
export function useCurrency() {
  return useAuth().agency?.currency ?? 'USD';
}
