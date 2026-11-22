import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Permission, RoleScope } from '@travelos/shared';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type { AccessTokenPayload, AuthUser } from '../common/auth.types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Compared against when the email is unknown, so response time does not reveal which emails exist. */
const DUMMY_HASH = bcrypt.hashSync('safarni-timing-guard', 12);
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

const userInclude = {
  membership: {
    include: {
      office: true,
      branch: true,
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
} as const;

type UserWithMembership = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class AuthService {
  private readonly refreshDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.refreshDays = Number(config.get('REFRESH_TOKEN_DAYS', 30));
  }

  async login(email: string, password: string, meta: ClientMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: userInclude,
    });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');
    this.assertCanSignIn(user);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issue(user, randomUUID(), meta);
  }

  /**
   * Refresh-token rotation: each refresh token works once. Presenting an already-used token means it
   * was copied; the whole session family is revoked and the user must sign in again.
   */
  async refresh(rawToken: string, meta: ClientMeta) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (!stored) throw new UnauthorizedException('Session expired. Please sign in again.');

    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException('Session expired. Please sign in again.');

    // Revoke-then-issue; the conditional update makes concurrent refreshes of the same token safe.
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    // Claims are rebuilt from the database, so role/permission changes apply at the next refresh.
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId }, include: userInclude });
    this.assertCanSignIn(user);
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

  // ------------------------------------------------------------------ internals

  private assertCanSignIn(user: UserWithMembership) {
    if (!user.isActive) throw new UnauthorizedException('Invalid email or password');
    if (user.isPlatformAdmin) return;
    const m = user.membership;
    if (!m || !m.isActive || !m.office.isActive || !m.branch.isActive) {
      throw new UnauthorizedException('Your account is not active. Contact your office administrator.');
    }
  }


  private async issue(user: UserWithMembership, familyId: string, meta: ClientMeta) {
    const m = user.membership;
    const permissions = (m?.role.permissions.map((rp) => rp.permission.key) ?? []) as Permission[];
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      pa: user.isPlatformAdmin,
      mid: m?.id ?? null,
      oid: m?.officeId ?? null,
      bid: m?.branchId ?? null,
      scp: (m?.role.scope as RoleScope | undefined) ?? null,
      perms: permissions,
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
      user: this.profile(user),
    };
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private profile(user: UserWithMembership) {
    const m = user.membership;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      locale: user.locale,
      isPlatformAdmin: user.isPlatformAdmin,
      office: m
        ? {
            id: m.office.id,
            name: m.office.name,
            slug: m.office.slug,
            logoUrl: m.office.logoUrl,
            defaultCurrencyCode: m.office.defaultCurrencyCode,
            defaultLocale: m.office.defaultLocale,
          }
        : null,
      branch: m ? { id: m.branch.id, name: m.branch.name } : null,
      role: m ? { id: m.role.id, name: m.role.name, scope: m.role.scope } : null,
      permissions: (m?.role.permissions.map((rp) => rp.permission.key) ?? []) as Permission[],
    };
  }
}
