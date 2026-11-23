import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission } from '@travelos/shared';
import type { Request } from 'express';
import type { AuthUser } from '../auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
/** Opt a route out of authentication (login, refresh, public landing endpoints). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'permissions';
/** Require ALL listed permissions. */
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const ANY_PERMISSION_KEY = 'anyPermission';
/** Require at least ONE of the listed permissions. */
export const RequireAnyPermission = (...permissions: Permission[]) => SetMetadata(ANY_PERMISSION_KEY, permissions);

export const ALLOW_PASSWORD_CHANGE_KEY = 'allowWithInitialPassword';
/** Reachable while the user still has to change the initial password (me, change-password, logout). */
export const AllowWithInitialPassword = () => SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);

/** The authenticated user, taken from the verified token. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user;
});

/** Client IP for the audit log. */
export const ClientIp = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return req.ip;
});
