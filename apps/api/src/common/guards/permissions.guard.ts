import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@travelos/shared';
import type { Request } from 'express';
import type { AuthUser } from '../auth.types';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  PLATFORM_ADMIN_KEY,
} from '../decorators';

/**
 * Registered globally after JwtAuthGuard.
 * - @PlatformAdminOnly(): Safarni staff only.
 * - @RequirePermissions(...): an active office member whose role grants every listed permission.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets))
      return true;

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!user) return false;

    if (
      this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, targets)
    ) {
      if (!user.isPlatformAdmin)
        throw new ForbiddenException('Platform administrators only');
      return true;
    }

    // No decorator: any authenticated user. @RequirePermissions() with no keys: any office member.
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      targets,
    );
    if (required === undefined) return true;

    if (!user.officeId || !user.memberId) {
      throw new ForbiddenException('This action requires an office account');
    }
    const missing = required.filter((p) => !user.permissions.includes(p));
    if (missing.length) {
      throw new ForbiddenException(
        `Your role does not allow this action (${missing.join(', ')})`,
      );
    }
    return true;
  }
}
