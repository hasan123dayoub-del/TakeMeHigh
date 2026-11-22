/**
 * Shared domain vocabulary for TravelOS.
 * Used by both the API (validation, entities) and the web app (labels, badges).
 */

export const ROLES = ['OWNER', 'ADMIN', 'OPERATIONS_MANAGER', 'BOOKING_AGENT', 'ACCOUNTANT'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Administrator',
  OPERATIONS_MANAGER: 'Operations Manager',
  BOOKING_AGENT: 'Booking Agent',
  ACCOUNTANT: 'Accountant',
};

export const TRIP_STATUSES = ['DRAFT', 'PUBLISHED', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_SOURCES = ['OFFICE', 'PHONE', 'WHATSAPP', 'PUBLIC_PAGE'] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_WALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUPPLIER_TYPES = ['HOTEL', 'TRANSPORT', 'GUIDE', 'OTHER'] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  'ACCOMMODATION',
  'TRANSPORT',
  'GUIDES',
  'MEALS',
  'MARKETING',
  'OFFICE',
  'SALARIES',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Which roles may perform which capability. Enforced server-side; the web app only uses it to hide UI. */
export const PERMISSIONS = {
  'trips.read': ROLES,
  'trips.write': ['OWNER', 'ADMIN', 'OPERATIONS_MANAGER'],
  'bookings.read': ROLES,
  'bookings.write': ['OWNER', 'ADMIN', 'OPERATIONS_MANAGER', 'BOOKING_AGENT'],
  'customers.read': ROLES,
  'customers.write': ['OWNER', 'ADMIN', 'OPERATIONS_MANAGER', 'BOOKING_AGENT'],
  'suppliers.read': ['OWNER', 'ADMIN', 'OPERATIONS_MANAGER', 'ACCOUNTANT'],
  'suppliers.write': ['OWNER', 'ADMIN', 'OPERATIONS_MANAGER'],
  'finance.read': ['OWNER', 'ADMIN', 'ACCOUNTANT'],
  'finance.write': ['OWNER', 'ADMIN', 'ACCOUNTANT'],
  'payments.write': ['OWNER', 'ADMIN', 'ACCOUNTANT', 'BOOKING_AGENT'],
  'reports.read': ['OWNER', 'ADMIN', 'OPERATIONS_MANAGER', 'ACCOUNTANT'],
  'users.manage': ['OWNER', 'ADMIN'],
  'settings.manage': ['OWNER', 'ADMIN'],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
