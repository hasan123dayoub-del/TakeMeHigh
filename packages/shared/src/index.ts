/**
 * TakeMeHigh shared vocabulary: permission catalogue, default roles, enums and labels.
 * Used by the API (seeding, guards) and the web app (hiding UI). The API is the authority.
 * Source of truth: docs/srs/takemehigh (Appendix B.4).
 */

// ------------------------------------------------------------------ permissions (SRS B.4)

export const PERMISSIONS = {
  // administration
  'users.view': { module: 'administration', ar: 'عرض المستخدمين', en: 'View users' },
  'users.manage': { module: 'administration', ar: 'إضافة وتعديل وتعطيل الموظفين والأدلة', en: 'Manage employees and guides' },
  'roles.manage': { module: 'administration', ar: 'إدارة الأدوار والصلاحيات', en: 'Manage roles and permissions' },
  'branches.view': { module: 'administration', ar: 'عرض الفروع', en: 'View branches' },
  'branches.manage': { module: 'administration', ar: 'إدارة الفروع', en: 'Manage branches' },
  'audit.view': { module: 'administration', ar: 'عرض سجل التدقيق', en: 'View the audit log' },
  // reference data
  'geo.view': { module: 'reference', ar: 'عرض الدول والمحافظات', en: 'View countries and cities' },
  'geo.manage': { module: 'reference', ar: 'إدارة الدول والمحافظات (تفعيل/تعطيل)', en: 'Manage countries and cities' },
  'categories.manage': { module: 'reference', ar: 'إدارة تصنيفات الرحلات', en: 'Manage trip categories' },
  // suppliers & pricing
  'services.manage': { module: 'suppliers', ar: 'إدارة الخدمات', en: 'Manage services' },
  'companies.view': { module: 'suppliers', ar: 'عرض الشركات والبنود', en: 'View companies and items' },
  'companies.manage': { module: 'suppliers', ar: 'إدارة الشركات والبنود', en: 'Manage companies and items' },
  'integrations.manage': { module: 'suppliers', ar: 'إعداد التكامل والمزامنة', en: 'Manage supplier integrations' },
  'pricing.view_breakdown': { module: 'pricing', ar: 'عرض السعر التفصيلي (الكلفة والربح)', en: 'View cost and profit breakdown' },
  'pricing.set_profit': { module: 'pricing', ar: 'تحديد الأرباح وقواعدها', en: 'Set profit and profit rules' },
  // products
  'trips.view': { module: 'products', ar: 'عرض الرحلات', en: 'View trips' },
  'trips.manage': { module: 'products', ar: 'إنشاء وتعديل الرحلات ونشرها', en: 'Create, edit and publish trips' },
  'trips.close': { module: 'products', ar: 'إغلاق التسجيل يدوياً والقرار بعد الإغلاق', en: 'Close registration and decide' },
  'trips.cancel': { module: 'products', ar: 'إلغاء رحلة أو برنامج وإعادة فتح التسجيل', en: 'Cancel and reopen registration' },
  'trips.passengers': { module: 'products', ar: 'عرض كشف ركاب الرحلة', en: 'View trip passenger lists' },
  'trips.attendance': { module: 'products', ar: 'تسجيل حضور الركاب والملاحظات', en: 'Record attendance and notes' },
  'programs.view': { module: 'products', ar: 'عرض البرامج', en: 'View programs' },
  'programs.manage': { module: 'products', ar: 'إنشاء وتعديل البرامج ونشرها', en: 'Create, edit and publish programs' },
  'offers.view': { module: 'products', ar: 'عرض العروض', en: 'View offers' },
  'offers.manage': { module: 'products', ar: 'إدارة العروض والخصومات', en: 'Manage offers and discounts' },
  // customers & bookings
  'customers.view': { module: 'customers', ar: 'عرض العملاء ووثائقهم', en: 'View customers and documents' },
  'customers.manage': { module: 'customers', ar: 'إضافة وتعديل العملاء والوثائق', en: 'Manage customers and documents' },
  'bookings.view': { module: 'bookings', ar: 'عرض الحجوزات', en: 'View bookings' },
  'bookings.create': { module: 'bookings', ar: 'إضافة عميل إلى رحلة أو برنامج أو عرض', en: 'Add customers to trips, programs and offers' },
  'bookings.cancel': { module: 'bookings', ar: 'إلغاء الحجوزات وإدارة الانتظار', en: 'Cancel bookings and manage the waitlist' },
  'visas.manage': { module: 'bookings', ar: 'متابعة التأشيرات', en: 'Manage visas' },
  // finance
  'payments.view': { module: 'finance', ar: 'عرض الدفعات', en: 'View payments' },
  'payments.create': { module: 'finance', ar: 'تسجيل دفعة وطباعة الوصل', en: 'Record payments and print receipts' },
  'payments.refund': { module: 'finance', ar: 'تسجيل استرجاع', en: 'Record refunds' },
  // public site
  'requests.view': { module: 'public', ar: 'عرض طلبات الرحلات المخصصة', en: 'View custom trip requests' },
  'requests.manage': { module: 'public', ar: 'إسناد الطلبات ومعالجتها وتحويلها', en: 'Assign, handle and convert requests' },
  'site.manage': { module: 'public', ar: 'إدارة محتوى الصفحة العامة وإعداداتها', en: 'Manage the public site' },
  // reports
  'reports.operational': { module: 'reports', ar: 'التقارير التشغيلية والتصدير', en: 'Operational reports and exports' },
  'stats.view': { module: 'reports', ar: 'الإحصائيات المالية الشهرية والسنوية', en: 'Monthly and yearly financial statistics' },
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const PERMISSION_MODULES = {
  administration: { ar: 'الإدارة', en: 'Administration' },
  reference: { ar: 'البيانات المرجعية', en: 'Reference data' },
  suppliers: { ar: 'الموردون', en: 'Suppliers' },
  pricing: { ar: 'التسعير', en: 'Pricing' },
  products: { ar: 'الرحلات والبرامج والعروض', en: 'Trips, programs and offers' },
  customers: { ar: 'العملاء', en: 'Customers' },
  bookings: { ar: 'الحجوزات', en: 'Bookings' },
  finance: { ar: 'المالية', en: 'Finance' },
  public: { ar: 'الصفحة العامة', en: 'Public site' },
  reports: { ar: 'التقارير', en: 'Reports' },
} as const;

/** ALL = every branch (Admin), BRANCH = own branch, ASSIGNED = trips assigned to the user (guide). */
export type RoleScope = 'ALL' | 'BRANCH' | 'ASSIGNED';
export type SystemRoleCode = 'ADMIN' | 'BRANCH_MANAGER' | 'EMPLOYEE' | 'TOUR_GUIDE';

/** The four system roles and their default permissions (SRS B.4). Admin's set cannot be reduced. */
export const SYSTEM_ROLES: ReadonlyArray<{
  code: SystemRoleCode;
  nameAr: string;
  nameEn: string;
  scope: RoleScope;
  description: string;
  permissions: readonly Permission[];
}> = [
  {
    code: 'ADMIN',
    nameAr: 'مدير المكتب',
    nameEn: 'Admin',
    scope: 'ALL',
    description: 'Office owner: every branch and every permission.',
    permissions: ALL_PERMISSIONS,
  },
  {
    code: 'BRANCH_MANAGER',
    nameAr: 'مدير فرع',
    nameEn: 'Branch manager',
    scope: 'BRANCH',
    description: 'Runs one branch: trips, bookings, customers, payments and branch staff. No costs or profit.',
    permissions: [
      'users.view',
      'users.manage',
      'branches.view',
      'geo.view',
      'companies.view',
      'trips.view',
      'trips.manage',
      'trips.close',
      'trips.passengers',
      'trips.attendance',
      'programs.view',
      'programs.manage',
      'offers.view',
      'customers.view',
      'customers.manage',
      'bookings.view',
      'bookings.create',
      'bookings.cancel',
      'visas.manage',
      'payments.view',
      'payments.create',
      'requests.view',
      'requests.manage',
      'reports.operational',
    ],
  },
  {
    code: 'EMPLOYEE',
    nameAr: 'موظف',
    nameEn: 'Employee',
    scope: 'BRANCH',
    description: 'Front desk of one branch: customers, bookings, cash payments and receipts.',
    permissions: [
      'branches.view',
      'geo.view',
      'companies.view',
      'trips.view',
      'trips.passengers',
      'programs.view',
      'offers.view',
      'customers.view',
      'customers.manage',
      'bookings.view',
      'bookings.create',
      'visas.manage',
      'payments.view',
      'payments.create',
      'requests.view',
      'requests.manage',
      'reports.operational',
    ],
  },
  {
    code: 'TOUR_GUIDE',
    nameAr: 'دليل سياحي',
    nameEn: 'Tour guide',
    scope: 'ASSIGNED',
    description: 'Reads the trips assigned to them and their passengers; records attendance and notes.',
    permissions: ['geo.view', 'trips.view', 'trips.passengers', 'trips.attendance', 'programs.view'],
  },
];

export function hasPermission(granted: readonly string[] | undefined, permission: Permission): boolean {
  return !!granted?.includes(permission);
}

// ------------------------------------------------------------------ enums

export const CITY_KINDS = ['GOVERNORATE', 'CITY', 'TOURIST_SPOT'] as const;
export type CityKind = (typeof CITY_KINDS)[number];

export const SERVICE_KINDS = ['HOTEL', 'TRANSPORT', 'RESTAURANT', 'OTHER'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];
/** The three core services; a trip, program or request needs at least two different ones (BR-04). */
export const CORE_SERVICE_KINDS = ['HOTEL', 'TRANSPORT', 'RESTAURANT'] as const;
export const MIN_DISTINCT_SERVICES = 2;

export const TRANSPORT_MODES = ['LAND', 'SEA', 'AIR'] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const ITEM_SOURCES = ['INTEGRATION', 'MANUAL'] as const;
export type ItemSource = (typeof ITEM_SOURCES)[number];

export const PROFIT_MODES = ['PERCENT', 'FIXED'] as const;
export type ProfitMode = (typeof PROFIT_MODES)[number];

export const TRAVEL_SCOPES = ['DOMESTIC', 'INTERNATIONAL'] as const;
export type TravelScope = (typeof TRAVEL_SCOPES)[number];

export const PRODUCT_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Allowed lifecycle transitions (SRS B.5). */
export const PRODUCT_TRANSITIONS: Record<ProductStatus, readonly ProductStatus[]> = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['CLOSED', 'CANCELLED'],
  CLOSED: ['CONFIRMED', 'OPEN', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
};

export const CLOSURE_REASONS = ['DEADLINE', 'MANUAL'] as const;
export type ClosureReason = (typeof CLOSURE_REASONS)[number];

export const DECISION_TYPES = ['CONFIRM', 'EXTEND', 'CANCEL', 'REOPEN'] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

export const OFFER_KINDS = ['BUNDLE', 'DISCOUNT'] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

export const GENDERS = ['MALE', 'FEMALE'] as const;
export type Gender = (typeof GENDERS)[number];

export const DOCUMENT_TYPES = ['SYRIAN_ID', 'PASSPORT', 'VISA', 'RESIDENCE'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'WAITLIST', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
/** Only these consume seats (BR-12). */
export const SEAT_CONSUMING_STATUSES: readonly BookingStatus[] = ['CONFIRMED'];

export const ATTENDANCE = ['PRESENT', 'ABSENT'] as const;
export type Attendance = (typeof ATTENDANCE)[number];

export const VISA_STATUSES = ['NOT_STARTED', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
export type VisaStatus = (typeof VISA_STATUSES)[number];

export const PAYMENT_KINDS = ['PARTIAL', 'FULL', 'REFUND'] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_METHODS = ['CASH'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentState = 'UNPAID' | 'PARTIAL' | 'PAID';

export const REQUEST_STATUSES = ['NEW', 'CONTACTED', 'CONVERTED', 'REJECTED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const SLIDE_LINKS = ['NONE', 'TRIP', 'PROGRAM', 'OFFER'] as const;
export type SlideLink = (typeof SLIDE_LINKS)[number];

export const INTEGRATION_STATUSES = ['NOT_CONFIGURED', 'ACTIVE', 'ERROR', 'DISABLED'] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

// ------------------------------------------------------------------ labels

type Labels<T extends string> = Record<T, { ar: string; en: string }>;

export const LABELS = {
  roleScope: {
    ALL: { ar: 'كل الفروع', en: 'All branches' },
    BRANCH: { ar: 'الفرع', en: 'Own branch' },
    ASSIGNED: { ar: 'المسند فقط', en: 'Assigned only' },
  } satisfies Labels<RoleScope>,
  cityKind: {
    GOVERNORATE: { ar: 'محافظة', en: 'Governorate' },
    CITY: { ar: 'مدينة', en: 'City' },
    TOURIST_SPOT: { ar: 'موقع سياحي', en: 'Tourist spot' },
  } satisfies Labels<CityKind>,
  serviceKind: {
    HOTEL: { ar: 'فندق', en: 'Hotel' },
    TRANSPORT: { ar: 'نقل', en: 'Transport' },
    RESTAURANT: { ar: 'مطعم', en: 'Restaurant' },
    OTHER: { ar: 'أخرى', en: 'Other' },
  } satisfies Labels<ServiceKind>,
  transportMode: {
    LAND: { ar: 'برّي', en: 'Land' },
    SEA: { ar: 'بحري', en: 'Sea' },
    AIR: { ar: 'جوّي', en: 'Air' },
  } satisfies Labels<TransportMode>,
  itemSource: {
    INTEGRATION: { ar: 'تكامل', en: 'Integration' },
    MANUAL: { ar: 'يدوي', en: 'Manual' },
  } satisfies Labels<ItemSource>,
  profitMode: {
    PERCENT: { ar: 'نسبة مئوية', en: 'Percentage' },
    FIXED: { ar: 'مبلغ ثابت', en: 'Fixed amount' },
  } satisfies Labels<ProfitMode>,
  travelScope: {
    DOMESTIC: { ar: 'داخلية', en: 'Domestic' },
    INTERNATIONAL: { ar: 'خارجية', en: 'International' },
  } satisfies Labels<TravelScope>,
  productStatus: {
    DRAFT: { ar: 'مسودة', en: 'Draft' },
    OPEN: { ar: 'التسجيل مفتوح', en: 'Registration open' },
    CLOSED: { ar: 'التسجيل مغلق', en: 'Registration closed' },
    CONFIRMED: { ar: 'مؤكدة', en: 'Confirmed' },
    CANCELLED: { ar: 'ملغاة', en: 'Cancelled' },
    COMPLETED: { ar: 'مكتملة', en: 'Completed' },
  } satisfies Labels<ProductStatus>,
  closureReason: {
    DEADLINE: { ar: 'انتهاء المهلة', en: 'Deadline' },
    MANUAL: { ar: 'إغلاق يدوي', en: 'Manual' },
  } satisfies Labels<ClosureReason>,
  decisionType: {
    CONFIRM: { ar: 'تأكيد التنفيذ', en: 'Confirm' },
    EXTEND: { ar: 'تمديد التسجيل', en: 'Extend registration' },
    CANCEL: { ar: 'إلغاء', en: 'Cancel' },
    REOPEN: { ar: 'إعادة فتح', en: 'Reopen' },
  } satisfies Labels<DecisionType>,
  offerKind: {
    BUNDLE: { ar: 'حزمة خدمات', en: 'Service bundle' },
    DISCOUNT: { ar: 'خصم', en: 'Discount' },
  } satisfies Labels<OfferKind>,
  gender: {
    MALE: { ar: 'ذكر', en: 'Male' },
    FEMALE: { ar: 'أنثى', en: 'Female' },
  } satisfies Labels<Gender>,
  documentType: {
    SYRIAN_ID: { ar: 'هوية سورية', en: 'Syrian ID' },
    PASSPORT: { ar: 'جواز سفر', en: 'Passport' },
    VISA: { ar: 'تأشيرة', en: 'Visa' },
    RESIDENCE: { ar: 'إقامة', en: 'Residence permit' },
  } satisfies Labels<DocumentType>,
  bookingStatus: {
    PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
    CONFIRMED: { ar: 'مؤكد', en: 'Confirmed' },
    WAITLIST: { ar: 'قائمة الانتظار', en: 'Waitlist' },
    CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
  } satisfies Labels<BookingStatus>,
  attendance: {
    PRESENT: { ar: 'حاضر', en: 'Present' },
    ABSENT: { ar: 'غائب', en: 'Absent' },
  } satisfies Labels<Attendance>,
  visaStatus: {
    NOT_STARTED: { ar: 'لم تبدأ', en: 'Not started' },
    SUBMITTED: { ar: 'مقدَّمة', en: 'Submitted' },
    APPROVED: { ar: 'موافق عليها', en: 'Approved' },
    REJECTED: { ar: 'مرفوضة', en: 'Rejected' },
  } satisfies Labels<VisaStatus>,
  paymentKind: {
    PARTIAL: { ar: 'جزئي', en: 'Partial' },
    FULL: { ar: 'كامل', en: 'Full' },
    REFUND: { ar: 'استرجاع', en: 'Refund' },
  } satisfies Labels<PaymentKind>,
  paymentMethod: {
    CASH: { ar: 'نقداً', en: 'Cash' },
  } satisfies Labels<PaymentMethod>,
  paymentState: {
    UNPAID: { ar: 'غير مدفوع', en: 'Unpaid' },
    PARTIAL: { ar: 'مدفوع جزئياً', en: 'Partially paid' },
    PAID: { ar: 'مدفوع', en: 'Paid' },
  } satisfies Labels<PaymentState>,
  requestStatus: {
    NEW: { ar: 'جديد', en: 'New' },
    CONTACTED: { ar: 'تم التواصل', en: 'Contacted' },
    CONVERTED: { ar: 'تم التحويل', en: 'Converted' },
    REJECTED: { ar: 'مرفوض', en: 'Rejected' },
  } satisfies Labels<RequestStatus>,
  slideLink: {
    NONE: { ar: 'بدون رابط', en: 'No link' },
    TRIP: { ar: 'رحلة', en: 'Trip' },
    PROGRAM: { ar: 'برنامج', en: 'Program' },
    OFFER: { ar: 'عرض', en: 'Offer' },
  } satisfies Labels<SlideLink>,
  integrationStatus: {
    NOT_CONFIGURED: { ar: 'غير مُعد', en: 'Not configured' },
    ACTIVE: { ar: 'فعّال', en: 'Active' },
    ERROR: { ar: 'خطأ', en: 'Error' },
    DISABLED: { ar: 'معطّل', en: 'Disabled' },
  } satisfies Labels<IntegrationStatus>,
};

// ------------------------------------------------------------------ API shapes

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Builds the WhatsApp "Book now" link (LND-05). Placeholders: {title} {code} {price} {link}. */
export function whatsappLink(
  number: string,
  template: string,
  values: { title: string; code?: string; price?: string; link?: string },
): string {
  const text = template
    .replace(/\{title\}/g, values.title)
    .replace(/\{code\}/g, values.code ?? '')
    .replace(/\{price\}/g, values.price ?? '')
    .replace(/\{link\}/g, values.link ?? '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  return `https://wa.me/${number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`;
}
