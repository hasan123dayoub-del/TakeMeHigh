import type { Role } from '@travelos/shared';

/** Identity attached to every authenticated request, derived only from the verified JWT. */
export interface AuthUser {
  userId: string;
  agencyId: string;
  role: Role;
  email: string;
}

export interface JwtPayload {
  sub: string;
  agencyId: string;
  role: Role;
  email: string;
}
