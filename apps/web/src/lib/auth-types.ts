import type { Permission, RoleScope } from '@travelos/shared';

/** GET /auth/me and the `user` of POST /auth/login */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  /** The initial password must be changed before anything else (AUTH-10) */
  mustChangePassword: boolean;
  role: { id: string; code: string; nameAr: string; nameEn: string; scope: RoleScope };
  /** null for the Admin (all branches) */
  branch: { id: string; name: string; city: string } | null;
  permissions: Permission[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  idleTimeoutMinutes: number;
  user: AuthUser;
}
