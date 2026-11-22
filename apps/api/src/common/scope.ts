import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthUser, OfficeUser } from './auth.types';

/**
 * Tenant + branch isolation helpers. Every query on office data goes through these, so the
 * office (and for BRANCH-scoped roles, the branch) always comes from the verified token.
 */

export function officeUser(user: AuthUser): OfficeUser {
  if (!user.officeId || !user.branchId || !user.memberId || !user.scope) {
    throw new ForbiddenException('This action requires an office account');
  }
  return user as OfficeUser;
}

/** Prisma `where` fragment for office-level data (customers, suppliers, tours...). */
export function officeWhere(user: AuthUser) {
  return { officeId: officeUser(user).officeId };
}

/**
 * Prisma `where` fragment for branch-owned data (trips, bookings, payments).
 * OFFICE scope sees all branches; BRANCH scope only its own.
 */
export function branchWhere(user: AuthUser) {
  const u = officeUser(user);
  return u.scope === 'OFFICE' ? { officeId: u.officeId } : { officeId: u.officeId, branchId: u.branchId };
}

/**
 * Throws 404 (never 403) when a branch-owned record is outside the user's reach, so ids from
 * other offices or branches cannot even be probed.
 */
export function assertBranchAccess(user: AuthUser, record: { officeId: string; branchId: string } | null, label = 'Record') {
  const u = officeUser(user);
  if (!record || record.officeId !== u.officeId || (u.scope === 'BRANCH' && record.branchId !== u.branchId)) {
    throw new NotFoundException(`${label} not found`);
  }
}

/** For writes that target a branch: BRANCH-scoped users may only act inside their own branch. */
export function resolveBranchId(user: AuthUser, requested?: string | null): string {
  const u = officeUser(user);
  if (u.scope === 'BRANCH') {
    if (requested && requested !== u.branchId) throw new ForbiddenException('You can only work inside your own branch');
    return u.branchId;
  }
  return requested ?? u.branchId;
}
