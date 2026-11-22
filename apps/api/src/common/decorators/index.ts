import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission } from '@travelos/shared';
import type { Request } from 'express';
import type { AuthUser } from '../auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
/** Opt a route out of authentication (login, refresh, public pages). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'permissions';
/** Require ALL listed permissions (from the user's office role). Implies an office member. */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const PLATFORM_ADMIN_KEY = 'platformAdmin';
/** Safarni platform staff only (manages offices, never reads office business data). */
export const PlatformAdminOnly = () => SetMetadata(PLATFORM_ADMIN_KEY, true);

/** The authenticated user, taken from the verified token. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user;
});
