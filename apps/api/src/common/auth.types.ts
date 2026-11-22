import type { Permission, RoleScope } from '@travelos/shared';

/**
 * Identity attached to every authenticated request, derived only from the verified access token.
 * Office users always have officeId + branchId + memberId; platform admins may have none.
 */
export interface AuthUser {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
  memberId: string | null;
  officeId: string | null;
  branchId: string | null;
  /** OFFICE = sees every branch of the office; BRANCH = only its own branch */
  scope: RoleScope | null;
  permissions: Permission[];
}

/** Office staff identity (guaranteed by OfficeMemberGuard). */
export type OfficeUser = AuthUser & {
  memberId: string;
  officeId: string;
  branchId: string;
  scope: RoleScope;
};

export interface AccessTokenPayload {
  sub: string;
  email: string;
  pa: boolean; // platform admin
  mid: string | null;
  oid: string | null;
  bid: string | null;
  scp: RoleScope | null;
  perms: Permission[];
}
