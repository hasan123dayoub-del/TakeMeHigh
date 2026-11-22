/**
 * Safarni (سفرني) shared vocabulary: permission catalogue, default roles and enum labels.
 * Used by the API (seeding, guards) and the web app (hiding UI). The API is the authority.
 */

// ------------------------------------------------------------------ permissions

export const PERMISSIONS = {
  // office administration
  'office.manage': { group: 'administration', ar: 'إدارة بيانات المكتب والإعدادات', en: 'Manage office profile and settings' },
  'branches.manage': { group: 'administration', ar: 'إدارة الفروع', en: 'Manage branches' },
  'employees.manage': { group: 'administration', ar: 'إدارة الموظفين', en: 'Manage employees' },
  'roles.manage': { group: 'administration', ar: 'إدارة الأدوار والصلاحيات', en: 'Manage roles and permissions' },
  'audit.view': { group: 'administration', ar: 'عرض سجل العمليات', en: 'View audit log' },
  // programs
  'tours.view': { group: 'programs', ar: 'عرض البرامج السياحية', en: 'View tours' },
  'tours.manage': { group: 'programs', ar: 'إدارة البرامج والتصنيفات', en: 'Manage tours and categories' },
  'trips.view': { group: 'programs', ar: 'عرض الرحلات', en: 'View trips' },
  'trips.manage': { group: 'programs', ar: 'إدارة الرحلات والخدمات والأسعار', en: 'Manage trips, services and pricing' },
  'trips.decide': { group: 'programs', ar: 'قرار تنفيذ الرحلة بعد انتهاء التسجيل', en: 'Approve, cancel or extend registration' },
  'trips.supervise': { group: 'programs', ar: 'الإشراف على الرحلة وتسجيل الحضور', en: 'Supervise trips and record attendance' },
  'offers.manage': { group: 'programs', ar: 'إدارة العروض والإعلانات', en: 'Manage offers and banners' },
  // suppliers
  'suppliers.view': { group: 'suppliers', ar: 'عرض الموردين', en: 'View suppliers' },
  'suppliers.manage': { group: 'suppliers', ar: 'إدارة الموردين', en: 'Manage suppliers' },
  'suppliers.pay': { group: 'suppliers', ar: 'تسجيل دفعات الموردين', en: 'Record supplier payments' },
  // customers & bookings
  'customers.view': { group: 'customers', ar: 'عرض الزبائن', en: 'View customers' },
  'customers.create': { group: 'customers', ar: 'إضافة زبون', en: 'Create customers' },
  'customers.edit': { group: 'customers', ar: 'تعديل زبون', en: 'Edit customers' },
  'bookings.view': { group: 'bookings', ar: 'عرض الحجوزات', en: 'View bookings' },
  'bookings.create': { group: 'bookings', ar: 'إنشاء حجز', en: 'Create bookings' },
  'bookings.edit': { group: 'bookings', ar: 'تعديل حجز', en: 'Edit bookings' },
  'bookings.confirm': { group: 'bookings', ar: 'تأكيد حجز', en: 'Confirm bookings' },
  'bookings.cancel': { group: 'bookings', ar: 'إلغاء حجز', en: 'Cancel bookings' },
  'bookings.transfer': { group: 'bookings', ar: 'نقل حجز إلى رحلة أخرى', en: 'Transfer bookings' },
  // money
  'payments.view': { group: 'finance', ar: 'عرض الدفعات', en: 'View payments' },
  'payments.record': { group: 'finance', ar: 'تسجيل دفعة', en: 'Record payments' },
  'refunds.record': { group: 'finance', ar: 'تسجيل استرجاع', en: 'Record refunds' },
  // reports
  'reports.view': { group: 'reports', ar: 'عرض التقارير التشغيلية', en: 'View operational reports' },
  'reports.financial': { group: 'reports', ar: 'عرض الأرباح والتقارير المالية', en: 'View profit and financial reports' },
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export type RoleScope = 'OFFICE' | 'BRANCH';

/** Roles every new office starts with. Offices can edit them or create more. */
export const DEFAULT_ROLES: ReadonlyArray<{
  key: 'ADMIN' | 'RECEPTION';
  name: string;
  nameAr: string;
  scope: RoleScope;
  description: string;
  permissions: readonly Permission[];
}> = [
  {
    key: 'ADMIN',
    name: 'Admin',
    nameAr: 'مدير',
    scope: 'OFFICE',
    description: 'Manages the whole office and all its branches.',
    permissions: ALL_PERMISSIONS,
  },
  {
    key: 'RECEPTION',
    name: 'Reception',
    nameAr: 'استقبال',
    scope: 'BRANCH',
    description: 'Daily front-desk work inside one branch: customers, bookings and cash payments.',
    permissions: [
      'tours.view',
      'trips.view',
      'customers.view',
      'customers.create',
      'customers.edit',
      'bookings.view',
      'bookings.create',
      'bookings.edit',
      'bookings.confirm',
      'bookings.cancel',
      'payments.view',
      'payments.record',
      'reports.view',
    ],
  },
];

export function hasPermission(granted: readonly string[] | undefined, permission: Permission): boolean {
  return !!granted?.includes(permission);
}

// ------------------------------------------------------------------ enums & labels

export const TRIP_TYPES = ['VIP', 'STANDARD'] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const TRIP_STATUSES = ['DRAFT', 'OPEN', 'REGISTRATION_CLOSED', 'APPROVED', 'COMPLETED', 'CANCELLED'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'WAITING_LIST', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Only these consume seats (confirmed business rule). */
export const SEAT_CONSUMING_STATUSES: readonly BookingStatus[] = ['CONFIRMED'];

export const SUPPLIER_TYPES = ['HOTEL', 'TRANSPORT', 'RESTAURANT'] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DOCUMENT_TYPES = ['NATIONAL_ID', 'PASSPORT', 'FAMILY_BOOK', 'BIRTH_CERTIFICATE', 'OTHER'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const PAYMENT_METHODS = ['CASH'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const REGISTRATION_DECISIONS = ['APPROVE', 'CANCEL', 'EXTEND'] as const;
export type RegistrationDecision = (typeof REGISTRATION_DECISIONS)[number];

type Labels<T extends string> = Record<T, { ar: string; en: string }>;

export const LABELS = {
  tripType: { VIP: { ar: 'VIP', en: 'VIP' }, STANDARD: { ar: 'عادي', en: 'Standard' } } satisfies Labels<TripType>,
  tripStatus: {
    DRAFT: { ar: 'مسودة', en: 'Draft' },
    OPEN: { ar: 'التسجيل مفتوح', en: 'Registration open' },
    REGISTRATION_CLOSED: { ar: 'بانتظار القرار', en: 'Awaiting decision' },
    APPROVED: { ar: 'معتمدة', en: 'Approved' },
    COMPLETED: { ar: 'منتهية', en: 'Completed' },
    CANCELLED: { ar: 'ملغاة', en: 'Cancelled' },
  } satisfies Labels<TripStatus>,
  bookingStatus: {
    PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
    CONFIRMED: { ar: 'مؤكد', en: 'Confirmed' },
    WAITING_LIST: { ar: 'قائمة انتظار', en: 'Waiting list' },
    CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
  } satisfies Labels<BookingStatus>,
  supplierType: {
    HOTEL: { ar: 'فندق', en: 'Hotel' },
    TRANSPORT: { ar: 'نقل', en: 'Transport' },
    RESTAURANT: { ar: 'مطعم', en: 'Restaurant' },
  } satisfies Labels<SupplierType>,
  discountType: {
    PERCENTAGE: { ar: 'نسبة مئوية', en: 'Percentage' },
    FIXED: { ar: 'مبلغ ثابت', en: 'Fixed amount' },
  } satisfies Labels<DiscountType>,
  documentType: {
    NATIONAL_ID: { ar: 'هوية شخصية', en: 'National ID' },
    PASSPORT: { ar: 'جواز سفر', en: 'Passport' },
    FAMILY_BOOK: { ar: 'دفتر عائلة', en: 'Family book' },
    BIRTH_CERTIFICATE: { ar: 'شهادة ميلاد', en: 'Birth certificate' },
    OTHER: { ar: 'أخرى', en: 'Other' },
  } satisfies Labels<DocumentType>,
};

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
