'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Permission } from '@travelos/shared';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api, ApiError, emitTokenChange, onTokenChange, onUnauthorized, tokenStore } from './api';
import type { AuthUser, LoginResponse, OfficeRef } from './auth-types';
import { common } from './i18n/common';
import { useMessages } from './i18n';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  office: OfficeRef | null;
  /** OFFICE = sees all branches (Admin); BRANCH = own branch only (Reception) */
  scope: 'OFFICE' | 'BRANCH' | null;
  /** Error from GET /auth/me other than 401 (e.g. API unreachable). */
  error: ApiError | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: (opts?: { redirect?: boolean }) => void;
  /** Hides UI the role can't use. The API enforces the same permissions. */
  can: (...permissions: Permission[]) => boolean;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- access token as an external store (SSR-safe, cross-tab aware) -----------
function subscribeToken(listener: () => void) {
  const off = onTokenChange(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || (tokenStore.keys as readonly string[]).includes(e.key)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    off();
    window.removeEventListener('storage', onStorage);
  };
}
/** undefined = unknown yet (server render / before hydration) */
const getServerToken = () => undefined;
/** Session identity is the refresh token: the access token rotates every 15 minutes without a re-login. */
const getSession = () => tokenStore.getRefresh();

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useMessages(common);
  const session = useSyncExternalStore<string | null | undefined>(subscribeToken, getSession, getServerToken);

  const me = useQuery({
    queryKey: [...ME_QUERY_KEY, session],
    queryFn: () => api.get<AuthUser>('/auth/me'),
    enabled: !!session,
    staleTime: 5 * 60_000,
    retry: (count, err) => !(err instanceof ApiError && (err.isUnauthorized || err.isForbidden)) && count < 2,
  });

  useEffect(
    () =>
      onUnauthorized(() => {
        queryClient.clear();
        toast.error(t.sessionEnded, { description: t.sessionEndedBody });
      }),
    [queryClient, t],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<LoginResponse>('/auth/login', { email, password }, { anonymous: true });
      tokenStore.set(res.accessToken, res.refreshToken);
      queryClient.setQueryData([...ME_QUERY_KEY, res.refreshToken], res.user);
      emitTokenChange();
      return res.user;
    },
    [queryClient],
  );

  const logout = useCallback(
    ({ redirect = true }: { redirect?: boolean } = {}) => {
      const refreshToken = tokenStore.getRefresh();
      if (refreshToken) void api.post('/auth/logout', { refreshToken }, { anonymous: true }).catch(() => undefined);
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
    if (session === undefined) status = 'loading';
    else if (session === null) status = 'unauthenticated';
    else if (me.data) status = 'authenticated';
    else if (me.isError) {
      const err = me.error instanceof ApiError ? me.error : new ApiError({ statusCode: 0 });
      status = err.isUnauthorized ? 'unauthenticated' : 'error';
      error = err;
    } else status = 'loading';

    const user = status === 'authenticated' ? (me.data ?? null) : null;
    const granted = new Set(user?.permissions ?? []);
    return {
      status,
      user,
      office: user?.office ?? null,
      scope: user?.role?.scope ?? null,
      error,
      login,
      logout,
      can: (...permissions) => permissions.every((p) => granted.has(p)),
      retry: () => void me.refetch(),
    };
  }, [session, me, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** `const canRefund = useCan('refunds.record')` */
export function useCan(...permissions: Permission[]) {
  return useAuth().can(...permissions);
}

/** The office's default currency (each trip/booking still carries its own currency). */
export function useDefaultCurrency() {
  return useAuth().office?.defaultCurrencyCode ?? 'SYP';
}
