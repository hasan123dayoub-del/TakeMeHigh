import type { Permission, RoleScope } from '@travelos/shared';

export interface OfficeRef {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  defaultCurrencyCode: string;
  defaultLocale: 'AR' | 'EN';
}

/** GET /auth/me and the `user` of POST /auth/login */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  locale: 'AR' | 'EN';
  isPlatformAdmin: boolean;
  office: OfficeRef | null;
  branch: { id: string; name: string } | null;
  role: { id: string; name: string; scope: RoleScope } | null;
  permissions: Permission[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
}
