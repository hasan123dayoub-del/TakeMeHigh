import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from './auth.types';

/**
 * Data-scope helpers (AUTH-08). Every query on branch-owned data goes through these, so the
 * branch always comes from the verified token. Out-of-scope records answer 404, never 403,
 * so ids from other branches cannot even be probed.
 *
 *  - ALL      (Admin)        : every branch
 *  - BRANCH   (manager, employee): own branch only
 *  - ASSIGNED (tour guide)   : trips assigned to the user (and the programs containing them)
 */

export const isAll = (u: AuthUser) => u.scope === 'ALL';

/** Branch of a BRANCH/ASSIGNED user (never null for them, enforced by the users_branch_rule trigger). */
export function ownBranch(u: AuthUser): string {
  if (!u.branchId)
    throw new ForbiddenException('Your account is not linked to a branch');
  return u.branchId;
}

/**
 * `where` for data owned by exactly one branch (bookings, payments, customers, requests).
 * Guides have no access to these through this helper (callers use permissions to block them).
 */
export function branchOwned(
  u: AuthUser,
  requestedBranchId?: string,
): { branchId?: string } {
  if (isAll(u)) return requestedBranchId ? { branchId: requestedBranchId } : {};
  return { branchId: ownBranch(u) };
}

/**
 * `where` for products (trips, programs) whose branch_id may be NULL = shared by all branches.
 * BRANCH users see their own branch's products plus shared ones (TBD-21). Guides see assigned trips.
 */
export function productVisibility(u: AuthUser, requestedBranchId?: string) {
  if (isAll(u)) return requestedBranchId ? { branchId: requestedBranchId } : {};
  if (u.scope === 'ASSIGNED') return { guides: { some: { userId: u.userId } } };
  return { OR: [{ branchId: ownBranch(u) }, { branchId: null }] };
}

/** Program visibility: guides see programs that contain one of their trips. */
export function programVisibility(u: AuthUser, requestedBranchId?: string) {
  if (isAll(u)) return requestedBranchId ? { branchId: requestedBranchId } : {};
  if (u.scope === 'ASSIGNED')
    return {
      legs: { some: { trip: { guides: { some: { userId: u.userId } } } } },
    };
  return { OR: [{ branchId: ownBranch(u) }, { branchId: null }] };
}

/** 404 unless the branch-owned record is inside the user's reach. */
export function assertBranchRecord<T extends { branchId: string } | null>(
  u: AuthUser,
  record: T,
  label = 'Record',
): asserts record is NonNullable<T> {
  if (!record || (!isAll(u) && record.branchId !== u.branchId)) {
    throw new NotFoundException(`${label} not found`);
  }
}

/** For products: may this BRANCH user edit it? Shared products (branch_id NULL) are Admin-only. */
export function assertCanEditProduct(
  u: AuthUser,
  product: { branchId: string | null },
) {
  if (isAll(u)) return;
  if (u.scope !== 'BRANCH' || product.branchId !== u.branchId) {
    throw new ForbiddenException(
      'Only the Admin can change shared products or another branch’s products',
    );
  }
}

/** Branch for a new product: BRANCH users always create in their own branch; Admin chooses (or shared). */
export function productBranchFor(
  u: AuthUser,
  requested?: string | null,
): string | null {
  if (isAll(u)) return requested ?? null;
  const own = ownBranch(u);
  if (requested && requested !== own)
    throw new ForbiddenException('You can only work inside your own branch');
  return own;
}

/** Branch for new branch-owned data (customers, bookings): BRANCH users → own; Admin → requested. */
export function writeBranchFor(u: AuthUser, requested?: string | null): string {
  if (isAll(u)) {
    if (!requested)
      throw new ForbiddenException('Choose the branch for this record');
    return requested;
  }
  const own = ownBranch(u);
  if (requested && requested !== own)
    throw new ForbiddenException('You can only work inside your own branch');
  return own;
}
