import type { Permission, RoleScope } from '@travelos/shared';

/**
 * Identity attached to every authenticated request, derived only from the verified access token.
 * Single-tenant (BR-01): there is no office id. branchId is null only for ALL-scope roles (Admin).
 */
export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  roleCode: string;
  /** ALL = every branch, BRANCH = own branch, ASSIGNED = assigned trips only (AUTH-08) */
  scope: RoleScope;
  branchId: string | null;
  permissions: Permission[];
  /** Must change the initial password before using the API (AUTH-10) */
  mustChangePassword: boolean;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  scp: RoleScope;
  bid: string | null;
  perms: Permission[];
  mcp: boolean;
}
