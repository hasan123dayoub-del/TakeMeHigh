import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission } from '@travelos/shared';
import type { Request } from 'express';
import type { AuthUser } from '../auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
/** Opt a route out of the global JWT guard (login, public agency page). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSION_KEY = 'permission';
/** Require a capability from the shared permission matrix (see @travelos/shared PERMISSIONS). */
export const RequirePermission = (permission: Permission) => SetMetadata(PERMISSION_KEY, permission);

/** The authenticated user, taken from the verified token. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
  return req.user;
});

/** Shortcut for the tenant id. Always use this, never an agencyId from the body or query. */
export const AgencyId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
  return req.user.agencyId;
});
