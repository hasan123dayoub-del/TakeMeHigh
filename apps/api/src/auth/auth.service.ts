import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Permission, RoleScope } from '@travelos/shared';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AuditService } from '../audit-logs/audit.service';
import type { AccessTokenPayload, AuthUser } from '../common/auth.types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Compared against when the email is unknown, so response time does not reveal which emails exist. */
const DUMMY_HASH = bcrypt.hashSync('takemehigh-timing-guard', 12);
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const BCRYPT_ROUNDS = 12;
/** AUTH-03 */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
/** 5.3: the session ends after 30 minutes without activity */
export const IDLE_MINUTES = 30;

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
  branch: { include: { city: true } },
} as const;
type UserWithRole = Prisma.UserGetPayload<{ include: typeof userInclude }>;

const permissionsOf = (u: UserWithRole) => u.role.permissions.map((rp) => rp.permission.code) as Permission[];

@Injectable()
export class AuthService {
  private readonly refreshDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.refreshDays = Number(config.get('REFRESH_TOKEN_DAYS', 7));
  }

  async login(email: string, password: string, meta: ClientMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: userInclude,
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log(null, {
        action: 'auth.login_locked',
        entityType: 'user',
        entityId: user.id,
        summary: `Sign-in refused (locked): ${user.email}`,
        ip: meta.ip,
      });
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new UnauthorizedException(`Too many failed attempts. Try again in ${minutes} minute(s).`);
    }

    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.isActive) {
      if (user) await this.recordFailure(user.id, user.failedLoginCount, meta);
      else
        await this.audit.log(null, {
          action: 'auth.login_failed',
          entityType: 'user',
          summary: `Failed sign-in for unknown email ${email.slice(0, 120)}`,
          ip: meta.ip,
        });
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.branch && !user.branch.isActive) {
      throw new UnauthorizedException('Your branch is deactivated. Contact the office administrator.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });
    await this.audit.log(this.toAuthUser(user), {
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      summary: `${user.fullName} signed in`,
      ip: meta.ip,
    });
    return this.issue(user, randomUUID(), meta);
  }

  private async recordFailure(userId: string, previous: number, meta: ClientMeta) {
    const count = previous + 1;
    const lock = count >= MAX_FAILED_LOGINS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: lock ? 0 : count,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : undefined,
      },
    });
    await this.audit.log(null, {
      action: lock ? 'auth.account_locked' : 'auth.login_failed',
      entityType: 'user',
      entityId: userId,
      summary: lock ? `Account locked for ${LOCK_MINUTES} minutes after ${MAX_FAILED_LOGINS} failed attempts` : `Failed sign-in (${count}/${MAX_FAILED_LOGINS})`,
      ip: meta.ip,
    });
  }

  /**
   * Refresh-token rotation: each refresh token works once. Presenting an already-used token means it
   * was copied, so the whole session family is revoked (AUTH-02). A token unused for 30 minutes
   * expires (inactivity timeout).
   */
  async refresh(rawToken: string, meta: ClientMeta) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
    const expired = () => new UnauthorizedException('Session expired. Please sign in again.');
    if (!stored) throw expired();
    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw expired();
    }
    const idleLimit = new Date(Date.now() - IDLE_MINUTES * 60_000);
    if (stored.expiresAt < new Date() || stored.createdAt < idleLimit) {
      await this.revokeFamily(stored.familyId);
      throw expired();
    }

    // Revoke-then-issue; the conditional update makes concurrent refreshes of the same token safe.
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) {
      await this.revokeFamily(stored.familyId);
      throw expired();
    }

    // Claims are rebuilt from the database, so role/permission/branch changes apply at the next refresh.
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId }, include: userInclude });
    if (!user.isActive || (user.branch && !user.branch.isActive)) throw expired();
    return this.issue(user, stored.familyId, meta);
  }

  async logout(rawToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (stored) await this.revokeFamily(stored.familyId);
    return { signedOut: true };
  }

  async me(user: AuthUser) {
    const u = await this.prisma.user.findUnique({ where: { id: user.userId }, include: userInclude });
    if (!u || !u.isActive) throw new UnauthorizedException();
    return this.profile(u);
  }

  /** AUTH-10: the initial password must be changed; also used for regular password changes. */
  async changePassword(user: AuthUser, current: string, next: string, meta: ClientMeta) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId }, include: userInclude });
    if (!(await bcrypt.compare(current, u.passwordHash))) throw new BadRequestException('The current password is wrong');
    if (current === next) throw new BadRequestException('Choose a password different from the current one');
    const updated = await this.prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(next, BCRYPT_ROUNDS), mustChangePassword: false },
      include: userInclude,
    });
    // Every other session ends; this one continues with fresh tokens.
    await this.prisma.refreshToken.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log(user, { action: 'auth.password_changed', entityType: 'user', entityId: u.id, summary: `${u.fullName} changed their password`, ip: meta.ip });
    return this.issue(updated, randomUUID(), meta);
  }

  // ------------------------------------------------------------------ internals

  toAuthUser(u: UserWithRole): AuthUser {
    return {
      userId: u.id,
      email: u.email,
      fullName: u.fullName,
      roleCode: u.role.code,
      scope: u.role.scope as RoleScope,
      branchId: u.branchId,
      permissions: permissionsOf(u),
      mustChangePassword: u.mustChangePassword,
    };
  }

  private async issue(user: UserWithRole, familyId: string, meta: ClientMeta) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role.code,
      scp: user.role.scope as RoleScope,
      bid: user.branchId,
      perms: permissionsOf(user),
      mcp: user.mustChangePassword,
    };
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + this.refreshDays * 86_400_000);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId,
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 255),
        ip: meta.ip?.slice(0, 64),
      },
    });
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken,
      refreshTokenExpiresAt: expiresAt.toISOString(),
      idleTimeoutMinutes: IDLE_MINUTES,
      user: this.profile(user),
    };
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private profile(user: UserWithRole) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      mustChangePassword: user.mustChangePassword,
      role: {
        id: user.role.id,
        code: user.role.code,
        nameAr: user.role.nameAr,
        nameEn: user.role.nameEn,
        scope: user.role.scope,
      },
      branch: user.branch ? { id: user.branch.id, name: user.branch.name, city: user.branch.city.nameAr } : null,
      permissions: permissionsOf(user),
    };
  }
}
