import type { Role } from '@travelos/shared';

export interface Agency {
  id: string;
  name: string;
  slug: string;
  currency: string;
  logoUrl: string | null;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  agency: Agency | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
