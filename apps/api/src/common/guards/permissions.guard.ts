import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@travelos/shared';
import type { Request } from 'express';
import type { AuthUser } from '../auth.types';
import { ALLOW_PASSWORD_CHANGE_KEY, ANY_PERMISSION_KEY, IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../decorators';

/**
 * Registered globally after JwtAuthGuard (AUTH-07: deny by default on the server).
 * - Users who still have the initial password can only reach @AllowWithInitialPassword() routes.
 * - @RequirePermissions(...): every listed permission. @RequireAnyPermission(...): at least one.
 * - No decorator: any signed-in user (e.g. /auth/me, notifications).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const { user } = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!user) return false;

    if (user.mustChangePassword && !this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_KEY, targets)) {
      throw new ForbiddenException('Change your initial password first');
    }

    const all = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, targets);
    if (all?.length) {
      const missing = all.filter((p) => !user.permissions.includes(p));
      if (missing.length) throw new ForbiddenException(`Your role does not allow this action (${missing.join(', ')})`);
    }
    const any = this.reflector.getAllAndOverride<Permission[] | undefined>(ANY_PERMISSION_KEY, targets);
    if (any?.length && !any.some((p) => user.permissions.includes(p))) {
      throw new ForbiddenException(`Your role does not allow this action (${any.join(' or ')})`);
    }
    return true;
  }
}
