import type { Permission, RoleScope } from '@travelos/shared';

export interface Currency {
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
  decimals: number;
}

export interface Branch {
  id: string;
  officeId: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
  /** Present on GET /branches */
  employees?: number;
  trips?: number;
}

/** GET /office */
export interface Office {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brandColor: string | null;
  defaultCurrencyCode: string;
  defaultLocale: 'AR' | 'EN';
  publicPageEnabled: boolean;
  bookingTerms: string | null;
  cancellationTerms: string | null;
  isActive: boolean;
  currencies: Array<{ currencyCode: string; currency: Currency }>;
  branches: Branch[];
}

export interface UpdateOfficeInput {
  name?: string;
  description?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  brandColor?: string | null;
  defaultCurrencyCode?: string;
  defaultLocale?: 'AR' | 'EN';
  publicPageEnabled?: boolean;
  bookingTerms?: string | null;
  cancellationTerms?: string | null;
}

export interface BranchInput {
  name?: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}

/** GET /employees */
export interface Employee {
  id: string;
  jobTitle: string | null;
  isActive: boolean;
  createdAt: string;
  branch: { id: string; name: string };
  role: { id: string; name: string; scope: RoleScope };
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    lastLoginAt: string | null;
    locale: 'AR' | 'EN';
  };
}

export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  branchId: string;
  roleId: string;
  jobTitle?: string;
  locale?: 'AR' | 'EN';
}

export interface UpdateEmployeeInput {
  fullName?: string;
  phone?: string;
  branchId?: string;
  roleId?: string;
  jobTitle?: string;
  isActive?: boolean;
}

/** GET /roles */
export interface Role {
  id: string;
  name: string;
  description: string | null;
  scope: RoleScope;
  isSystem: boolean;
  members: number;
  permissions: Permission[];
}

export interface RoleInput {
  name?: string;
  description?: string;
  scope?: RoleScope;
  permissions?: Permission[];
}

/** GET /permissions */
export interface PermissionInfo {
  key: Permission;
  group: string;
  ar: string;
  en: string;
}

/** GET /banners */
export interface Banner {
  id: string;
  tripId: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  sortOrder: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  trip: { code: string } | null;
}

export interface BannerInput {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  tripId?: string | null;
  startsAt: string;
  endsAt: string;
  sortOrder?: number;
  isActive?: boolean;
}
