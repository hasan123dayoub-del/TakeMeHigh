/**
 * Response shapes of the TakeMeHigh API (apps/api). Money and decimals arrive as strings,
 * dates as ISO strings. Fields the API hides from a role (PRC-06) are optional.
 */
import type {
  Attendance,
  BookingStatus,
  CityKind,
  ClosureReason,
  DecisionType,
  DocumentType,
  Gender,
  IntegrationStatus,
  ItemSource,
  OfferKind,
  PaymentKind,
  PaymentState,
  ProductStatus,
  ProfitMode,
  RequestStatus,
  RoleScope,
  ServiceKind,
  SlideLink,
  TransportMode,
  TravelScope,
  VisaStatus,
} from '@travelos/shared';

export type { Paginated } from '@travelos/shared';

export type Money = string;
export type ISODate = string;

export interface NamedRef {
  id: string;
  nameAr: string;
  nameEn: string;
}

// ------------------------------------------------------------------ reference

export interface Country extends NamedRef {
  isoCode: string;
  isActive: boolean;
  _count?: { cities: number };
}

export interface City extends NamedRef {
  countryId: string;
  kind: CityKind;
  isActive: boolean;
  country?: { id: string; nameAr: string; nameEn: string; isoCode: string; isActive?: boolean };
}

export interface Category extends NamedRef {
  isActive: boolean;
  _count?: { trips: number; programs: number };
}

export interface Currency {
  code: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
  decimals: number;
}

export interface ServiceRef extends NamedRef {
  code: string;
  kind: ServiceKind;
}

export interface Lookups {
  countries: { id: string; isoCode: string; nameAr: string; nameEn: string }[];
  cities: { id: string; countryId: string; nameAr: string; nameEn: string; kind: CityKind }[];
  categories: NamedRef[];
  currencies: Currency[];
  services: ServiceRef[];
  branches: { id: string; name: string; cityId: string }[];
}

// ------------------------------------------------------------------ organisation

export interface Branch {
  id: string;
  name: string;
  cityId: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  latitude: string | null;
  longitude: string | null;
  workingHours: string | null;
  showOnLanding: boolean;
  isActive: boolean;
  city: NamedRef & { country?: { nameAr: string; nameEn: string } };
  _count?: { users: number };
}

export interface RoleRef {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  scope: RoleScope;
}

export interface Role extends RoleRef {
  description: string | null;
  isSystem: boolean;
  usersCount: number;
  permissions: string[];
}

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lockedUntil: ISODate | null;
  lastLoginAt: ISODate | null;
  createdAt: ISODate;
  role: RoleRef;
  branch: { id: string; name: string } | null;
  guideProfile: { languages: string | null; licenseNo: string | null; bio: string | null } | null;
}

// ------------------------------------------------------------------ suppliers

export interface Service extends ServiceRef {
  isSystem: boolean;
  isActive: boolean;
  _count?: { companies: number };
}

export interface Company {
  id: string;
  name: string;
  serviceId: string;
  countryId: string;
  cityId: string | null;
  transportMode: TransportMode | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  rating: number | null;
  isActive: boolean;
  service: ServiceRef;
  country: { id: string; nameAr: string; nameEn: string; isoCode: string };
  city: NamedRef | null;
  integration: { id: string; status: IntegrationStatus; lastSuccessAt: ISODate | null; lastError: string | null } | null;
  _count?: { items: number };
  profitRules?: ProfitRule[];
}

export interface CompanyItem {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  fromCityId: string | null;
  toCityId: string | null;
  /** null when the role cannot see costs */
  costPerPerson: Money | null;
  currencyCode: string;
  source: ItemSource;
  externalRef: string | null;
  lastSyncedAt: ISODate | null;
  isStale: boolean;
  available: boolean | null;
  isActive: boolean;
  fromCity: NamedRef | null;
  toCity: NamedRef | null;
  company: { id: string; name: string; transportMode: TransportMode | null; service: { id: string; kind: ServiceKind; nameAr: string } };
}

export interface ProfitRule {
  id: string;
  serviceId: string;
  companyId: string | null;
  mode: ProfitMode;
  value: Money;
  service?: { id: string; nameAr: string; nameEn: string; kind: ServiceKind };
  company?: { id: string; name: string } | null;
}

export interface IntegrationRow {
  id: string;
  name: string;
  transportMode: TransportMode | null;
  isActive: boolean;
  service: { kind: ServiceKind; nameAr: string; nameEn: string };
  integration: {
    id: string;
    adapterKey: string;
    baseUrl: string;
    status: IntegrationStatus;
    syncIntervalHours: number;
    lastSyncAt: ISODate | null;
    lastSuccessAt: ISODate | null;
    lastError: string | null;
    consecutiveFailures: number;
    hasCredentials: boolean;
  } | null;
  _count: { items: number };
}

export interface SyncLog {
  id: string;
  trigger: 'SCHEDULED' | 'MANUAL';
  result: 'SUCCESS' | 'FAILED';
  itemsUpdated: number;
  itemsCreated: number;
  costChanges: number;
  error: string | null;
  startedAt: ISODate;
  finishedAt: ISODate;
}

// ------------------------------------------------------------------ products

export interface CityRef {
  id: string;
  nameAr: string;
  nameEn: string;
  country?: { nameAr: string; isoCode: string };
}

export interface TripListItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  categoryId: string;
  branchId: string | null;
  scope: TravelScope;
  startsAt: ISODate;
  endsAt: ISODate;
  registrationDeadline: ISODate;
  minPassengers: number;
  maxPassengers: number;
  confirmedSeats: number;
  availableSeats: number;
  currencyCode: string;
  costPerPerson?: Money;
  pricePerPerson: Money;
  status: ProductStatus;
  isPublic: boolean;
  costChangedAt: ISODate | null;
  closedAt: ISODate | null;
  closureReason: ClosureReason | null;
  finalPassengerCount: number | null;
  cancelReason: string | null;
  coverImageUrl: string | null;
  terms: string | null;
  createdAt: ISODate;
  category: NamedRef;
  branch: { id: string; name: string } | null;
  originCity: NamedRef;
  destinationCity: CityRef;
  _count: { lines: number; guides: number; programLegs: number };
}

export interface TripLine {
  id: string;
  sequenceNo: number;
  startsAt: ISODate;
  endsAt: ISODate;
  transportMode: TransportMode | null;
  fromCityId: string | null;
  toCityId: string | null;
  quantity: number;
  unitCost?: Money;
  costSnapshot?: Money;
  profitMode?: ProfitMode;
  profitValue?: Money;
  sellingPrice?: Money;
  notes: string | null;
  item: {
    id: string;
    name: string;
    costPerPerson?: Money;
    currencyCode: string;
    isActive: boolean;
    isStale: boolean;
    available: boolean | null;
    company: { id: string; name: string; transportMode: TransportMode | null; isActive: boolean };
  };
  service: ServiceRef;
  fromCity: NamedRef | null;
  toCity: NamedRef | null;
}

export interface Decision {
  id: string;
  decision: DecisionType;
  passengersAtTime: number;
  previousDeadline: ISODate;
  newDeadline: ISODate | null;
  note: string | null;
  createdAt: ISODate;
  decidedBy: { fullName: string };
}

export interface TripDetail extends TripListItem {
  currency: Currency;
  lines: TripLine[];
  pickupPoints: { id: string; cityId: string; pickupTime: string | null; surcharge: Money; notes: string | null; city: NamedRef }[];
  guides: { tripId: string; userId: string; user: { id: string; fullName: string; phone: string | null; guideProfile: StaffUser['guideProfile'] } }[];
  images: { id: string; url: string; caption: string | null; sortOrder: number }[];
  programLegs: { programId: string; sequenceNo: number; program: { id: string; code: string; title: string; status: ProductStatus } }[];
  decisions: Decision[];
  offerTargets: { offer: { id: string; title: string; discountMode: ProfitMode; discountValue: Money; validFrom: ISODate; validTo: ISODate; isActive: boolean } }[];
  createdBy: { id: string; fullName: string } | null;
  passengers: { confirmed: number; pending: number; waitlist: number };
  /** COST_CHANGED, INACTIVE_SUPPLIER, STALE_COST, UNAVAILABLE_SERVICE, BELOW_MINIMUM */
  warnings: string[];
}

export interface ProgramLegTrip {
  id: string;
  code: string;
  title: string;
  status: ProductStatus;
  scope: TravelScope;
  branchId: string | null;
  startsAt: ISODate;
  endsAt: ISODate;
  registrationDeadline: ISODate;
  currencyCode: string;
  maxPassengers: number;
  confirmedSeats: number;
  pricePerPerson: Money;
  costPerPerson?: Money;
  originCityId: string;
  destinationCityId: string;
  originCity: NamedRef;
  destinationCity: NamedRef;
  pickupPoints: TripDetail['pickupPoints'];
  lines: { service: { kind: ServiceKind; nameAr: string }; transportMode: TransportMode | null }[];
}

export interface Program {
  id: string;
  code: string;
  title: string;
  description: string | null;
  categoryId: string;
  branchId: string | null;
  scope: TravelScope;
  registrationDeadline: ISODate;
  minPassengers: number;
  maxPassengers: number;
  confirmedSeats: number;
  availableSeats: number;
  currencyCode: string;
  costPerPerson?: Money;
  pricePerPerson: Money;
  status: ProductStatus;
  isPublic: boolean;
  closedAt: ISODate | null;
  closureReason: ClosureReason | null;
  finalPassengerCount: number | null;
  cancelReason: string | null;
  coverImageUrl: string | null;
  terms: string | null;
  createdAt: ISODate;
  startsAt: ISODate | null;
  endsAt: ISODate | null;
  services: ServiceKind[];
  category: NamedRef;
  branch: { id: string; name: string } | null;
  legs: { tripId: string; sequenceNo: number; trip: ProgramLegTrip }[];
  _count: { bookings: number };
  decisions?: Decision[];
}

export interface OfferLine {
  id: string;
  companyItemId: string;
  quantity: number;
  unitCost?: Money;
  costSnapshot?: Money;
  profitMode?: ProfitMode;
  profitValue?: Money;
  sellingPrice?: Money;
  item: { id: string; name: string; currencyCode: string; company: { id: string; name: string; transportMode: TransportMode | null }; toCity: { nameAr: string } | null };
  service: { id: string; kind: ServiceKind; nameAr: string; nameEn: string };
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  kind: OfferKind;
  discountMode: ProfitMode;
  discountValue: Money;
  validFrom: ISODate;
  validTo: ISODate;
  maxSeats: number | null;
  confirmedSeats: number;
  availableSeats: number | null;
  currencyCode: string | null;
  costPerPerson?: Money;
  pricePerPerson: Money;
  isPublic: boolean;
  isActive: boolean;
  live: boolean;
  coverImageUrl: string | null;
  terms: string | null;
  lines: OfferLine[];
  targets: {
    id: string;
    tripId: string | null;
    programId: string | null;
    trip: { id: string; code: string; title: string; status: ProductStatus; pricePerPerson: Money; currencyCode: string } | null;
    program: { id: string; code: string; title: string; status: ProductStatus; pricePerPerson: Money; currencyCode: string } | null;
  }[];
  _count: { bookings: number };
}

export interface ManifestPassenger {
  id: string;
  attendance: Attendance | null;
  guideNote: string | null;
  viaProgramId: string | null;
  customer: { id: string; fullName: string; phone: string; gender: Gender | null; birthDate: ISODate | null; nationality: { nameAr: string; isoCode: string } };
  document: { docType: DocumentType; docNumber: string; expiresOn: ISODate | null } | null;
  visas: { status: VisaStatus; country: { nameAr: string } }[];
  booking: { id: string; bookingNo: string; branchId: string; pickupPoint: { city: { nameAr: string }; pickupTime: string | null } | null; program: { code: string; title: string } | null };
}

// ------------------------------------------------------------------ customers & bookings

export interface CustomerDocument {
  id: string;
  docType: DocumentType;
  docNumber: string;
  issuingCountryId?: string;
  issuedOn?: ISODate | null;
  expiresOn: ISODate | null;
  filePath?: string | null;
  issuingCountry?: { nameAr: string; isoCode: string };
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  nationalityCountryId: string;
  birthDate: ISODate | null;
  gender: Gender | null;
  notes: string | null;
  branchId: string;
  isActive: boolean;
  createdAt: ISODate;
  nationality: { id: string; nameAr: string; nameEn: string; isoCode: string };
  branch: { id: string; name: string };
  documents: CustomerDocument[];
  _count: { bookingsPaid: number; travels: number };
}

export interface BookingSummary {
  id: string;
  bookingNo: string;
  status: BookingStatus;
  passengerCount: number;
  totalAmount: Money;
  paidAmount: Money;
  refundedAmount: Money;
  currencyCode: string;
  createdAt: ISODate;
  branch: { name: string };
  trip: { id: string; code: string; title: string; startsAt?: ISODate } | null;
  program: { id: string; code: string; title: string } | null;
  offer: { id: string; title: string } | null;
}

export interface CustomerDetail extends Customer {
  createdBy: { fullName: string } | null;
  bookingsAsPayer: BookingSummary[];
  trips: { attendance: Attendance | null; booking: BookingSummary }[];
  payments: { id: string; receiptNo: string; kind: PaymentKind; amount: Money; currencyCode: string; paidAt: ISODate; booking: { bookingNo: string } }[];
  visas: { id: string; status: VisaStatus; visaNumber: string | null; expiresOn: ISODate | null; country: { nameAr: string }; passenger: { booking: { bookingNo: string } } }[];
}

export interface BookingMoney {
  netPaid: Money;
  balance: Money;
  paymentState: PaymentState;
}

export interface BookingListItem extends BookingMoney {
  id: string;
  bookingNo: string;
  status: BookingStatus;
  passengerCount: number;
  currencyCode: string;
  pricePerPerson: Money;
  surchargePerPerson: Money;
  discountAmount: Money;
  discountTitle: string | null;
  totalAmount: Money;
  paidAmount: Money;
  refundedAmount: Money;
  createdAt: ISODate;
  targetTitle: string;
  trip: { id: string; code: string; title: string; startsAt: ISODate } | null;
  program: { id: string; code: string; title: string } | null;
  offer: { id: string; title: string } | null;
  payer: { id: string; fullName: string; phone: string };
  branch: { id: string; name: string };
  createdBy: { id: string; fullName: string };
}

export interface PaymentRow {
  id: string;
  receiptNo: string;
  bookingId: string;
  kind: PaymentKind;
  refundOfId: string | null;
  amount: Money;
  currencyCode: string;
  method: 'CASH';
  payerName: string;
  paidAt: ISODate;
  balanceAfter: Money;
  reason: string | null;
  notes: string | null;
  createdAt: ISODate;
  booking: { id: string; bookingNo: string; currencyCode: string; payer: { id: string; fullName: string; phone: string }; trip: { code: string; title: string } | null; program: { code: string; title: string } | null; offer: { title: string } | null };
  branch: { id: string; name: string };
  receivedBy: { id: string; fullName: string };
  refundOf: { id: string; receiptNo: string } | null;
}

export interface Receipt extends PaymentRow {
  office: { officeName: string; officeNameEn: string | null; logoUrl: string | null; phone: string | null; address: string | null; email: string | null } | null;
  target: string;
  bookingTotals: BookingMoney & { total: Money };
  printCount: number;
}

export interface BookingDetail extends BookingListItem {
  tripId: string | null;
  programId: string | null;
  offerId: string | null;
  costPerPerson?: Money;
  notes: string | null;
  confirmedAt: ISODate | null;
  cancelledAt: ISODate | null;
  cancelReason: string | null;
  trip: (BookingListItem['trip'] & { status: ProductStatus; scope: TravelScope; endsAt: ISODate; registrationDeadline: ISODate; maxPassengers: number; confirmedSeats: number; originCity: { nameAr: string }; destinationCity: { nameAr: string } }) | null;
  program: (NonNullable<BookingListItem['program']> & { status: ProductStatus; scope: TravelScope; registrationDeadline: ISODate; legs: { trip: { code: string; startsAt: ISODate; endsAt: ISODate } }[] }) | null;
  offer: (NonNullable<BookingListItem['offer']> & { kind: OfferKind; validFrom: ISODate; validTo: ISODate }) | null;
  pickupPoint: { id: string; pickupTime: string | null; surcharge: Money; city: NamedRef } | null;
  passengers: {
    id: string;
    customerId: string;
    documentId: string | null;
    attendance: Attendance | null;
    guideNote: string | null;
    customer: { id: string; fullName: string; phone: string; birthDate: ISODate | null; nationality: { nameAr: string; isoCode: string } };
    document: { id: string; docType: DocumentType; docNumber: string; expiresOn: ISODate | null } | null;
    visas: Visa[];
  }[];
  payments: (Omit<PaymentRow, 'booking' | 'branch' | 'refundOf'> & { receivedBy: { fullName: string } })[];
  events: { id: string; type: string; data: Record<string, unknown> | null; createdAt: ISODate; actor: { fullName: string } | null }[];
  convertedFrom: { id: string; requestNo: string } | null;
  documentCheck: { ok: boolean; problems: string[] };
  confirmRequiresPayment: boolean;
  warnings?: string[];
  seatsUnavailable?: boolean;
  waitlistSuggestions?: { id: string; bookingNo: string; passengerCount: number; payer: { fullName: string } }[];
}

export interface Visa {
  id: string;
  passengerId: string;
  countryId: string;
  status: VisaStatus;
  visaNumber: string | null;
  submittedAt: ISODate | null;
  decidedAt: ISODate | null;
  expiresOn: ISODate | null;
  fee: Money | null;
  notes: string | null;
  country: { id?: string; nameAr: string; nameEn?: string };
}

export interface VisaRow extends Visa {
  passenger: {
    id: string;
    customer: { id: string; fullName: string; phone: string };
    document: { docType: DocumentType; docNumber: string; expiresOn: ISODate | null } | null;
    booking: {
      id: string;
      bookingNo: string;
      status: BookingStatus;
      branchId: string;
      trip: { id: string; code: string; title: string; startsAt: ISODate } | null;
      program: { id: string; code: string; title: string; legs: { trip: { startsAt: ISODate } }[] } | null;
      offer: { id: string; title: string; validFrom: ISODate } | null;
    };
  };
}

// ------------------------------------------------------------------ public site & requests

export interface CustomRequest {
  id: string;
  requestNo: string;
  contactName: string;
  contactPhone: string;
  passengersCount: number;
  desiredFrom: ISODate;
  desiredTo: ISODate;
  message: string | null;
  status: RequestStatus;
  staffNotes: string | null;
  createdAt: ISODate;
  originCity: NamedRef;
  destinationCity: NamedRef;
  category: { id: string; nameAr: string } | null;
  assignedBranch: { id: string; name: string } | null;
  handledBy: { id: string; fullName: string } | null;
  convertedBooking: { id: string; bookingNo: string } | null;
  items: { id: string; otherText: string | null; transportMode: TransportMode | null; service: ServiceRef; company: { id: string; name: string; transportMode: TransportMode | null } | null }[];
}

export interface Slide {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkType: SlideLink;
  tripId: string | null;
  programId: string | null;
  offerId: string | null;
  sortOrder: number;
  isActive: boolean;
  trip?: { id: string; code: string; title: string } | null;
  program?: { id: string; code: string; title: string } | null;
  offer?: { id: string; title: string } | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string | null;
  achievedOn: ISODate | null;
  sortOrder: number;
  isActive: boolean;
  images: { id?: string; url: string; caption: string | null; sortOrder?: number }[];
}

export interface Policy {
  id: string;
  slug: string;
  title: string;
  body: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt?: ISODate;
}

export interface SiteSettings {
  id: number;
  officeName: string;
  officeNameEn: string | null;
  tagline: string | null;
  about: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  whatsappNumber: string;
  whatsappTemplate: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  defaultCurrencyCode: string;
  socialLinks: Record<string, string> | null;
  visaWarningDays: number;
  passportValidityMonths: number;
  deadlineWarningDays: number;
  confirmRequiresPayment: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  changes: unknown;
  ip: string | null;
  createdAt: ISODate;
  user: { id: string; fullName: string; email: string } | null;
}

// ------------------------------------------------------------------ reports

export interface StatRow {
  period: string;
  currency: string;
  bookings: number;
  passengers: number;
  revenue: Money;
  collected: Money;
  expectedProfit: Money;
  realizedProfit: Money;
}

export interface Stats {
  period: 'month' | 'year';
  year: number;
  series: StatRow[];
  totals: Record<string, Omit<StatRow, 'period' | 'currency'>>;
}

export interface DashboardData {
  role: string;
  month?: { currency: string; bookings: number; passengers: number; revenue: Money; collected: Money }[];
  upcomingTrips?: { id: string; code: string; title: string; startsAt: ISODate; status: ProductStatus; confirmedSeats: number; maxPassengers: number; minPassengers: number; registrationDeadline: ISODate }[];
  recentBookings?: { id: string; bookingNo: string; status: BookingStatus; payer: string; target: string; totalAmount: Money; currencyCode: string; createdAt: ISODate }[];
  pendingBookings?: number;
  newRequests?: number;
  profit?: StatRow[];
  yearSeries?: StatRow[];
  awaitingDecision?: number;
  myTrips?: { id: string; code: string; title: string; startsAt: ISODate; endsAt: ISODate; status: ProductStatus; passengers: number; from: string; to: string }[];
}

export interface Notifications {
  items: { type: 'NEW_REQUESTS' | 'DEADLINES_SOON' | 'AWAITING_DECISION' | 'COSTS_CHANGED' | 'INTEGRATION_ERRORS' | 'VISAS_MISSING'; severity: 'info' | 'warning' | 'danger'; count: number; link: string }[];
  total: number;
}
