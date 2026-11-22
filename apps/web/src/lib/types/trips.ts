import type {
  DiscountType,
  DocumentType,
  RegistrationDecision,
  SupplierType,
  TripStatus,
  TripType,
} from '@travelos/shared';
import type { TourDay } from './tours';

export interface TripOffer {
  id: string;
  officeId: string;
  tripId: string;
  title: string;
  description: string | null;
  discountType: DiscountType;
  /** Percent (0-100) or a fixed amount per person in the trip currency */
  discountValue: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Fields computed by the API for every trip (list and detail). */
export interface TripSummary {
  seatsAvailable: number;
  occupancyPct: number;
  minimumReached: boolean;
  /** YYYY-MM-DD: the deadline, or its extension */
  registrationClosesOn: string;
  activeOffer: TripOffer | null;
}

export interface TripBase extends TripSummary {
  id: string;
  officeId: string;
  branchId: string;
  tourId: string;
  code: string;
  tripType: TripType;
  departureDate: string;
  returnDate: string;
  currencyCode: string;
  minPassengers: number;
  maxSeats: number;
  confirmedSeats: number;
  registrationDeadline: string;
  registrationExtendedUntil: string | null;
  status: TripStatus;
  isPublic: boolean;
  costPerPerson: string;
  sellingPricePerPerson: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string };
}

/** Row of GET /trips */
export interface TripListItem extends TripBase {
  tour: {
    id: string;
    name: string;
    destination: string;
    days: number;
    nights: number;
    coverImageUrl: string | null;
    category: { name: string; nameAr: string | null } | null;
  };
  pendingBookings: number;
}

export interface TripServiceLine {
  id: string;
  tripId: string;
  supplierId: string;
  serviceType: SupplierType;
  description: string | null;
  costPerPerson: string;
  profitPercent: string;
  sellingPricePerPerson: string;
  supplier: { id: string; name: string; type: SupplierType; phone: string | null };
}

export interface TripDecision {
  id: string;
  decision: RegistrationDecision;
  note: string | null;
  confirmedAtDecision: number;
  minPassengers: number;
  newDeadline: string | null;
  previousDeadline: string | null;
  createdAt: string;
  decidedBy: { user: { fullName: string } } | null;
}

export interface TripFinancials {
  perPerson: {
    cost: string;
    selling: string;
    margin: string;
    lines: Array<{
      serviceType: SupplierType;
      supplier: string;
      cost: string;
      profitPercent: string;
      selling: string;
      margin: string;
    }>;
  };
  confirmed: {
    passengers: number;
    bookings: number;
    revenue: string;
    supplierCost: string;
    expectedProfit: string;
    collected: string;
    outstanding: string;
  };
  supplierDues: Array<{
    supplierId: string;
    supplier: string;
    serviceType: SupplierType;
    due: string;
    paid: string;
    remaining: string;
  }>;
}

/** GET /trips/:id */
export interface TripDetail extends TripBase {
  tour: {
    id: string;
    name: string;
    destination: string;
    days: number;
    nights: number;
    isActive: boolean;
    coverImageUrl: string | null;
    category: { id: string; name: string; nameAr: string | null } | null;
    itinerary: TourDay[];
  };
  services: TripServiceLine[];
  offers: TripOffer[];
  supervisors: Array<{ tripId: string; memberId: string; member: { id: string; user: { fullName: string } } }>;
  decisions: TripDecision[];
  financials: TripFinancials;
}

export interface TripServiceInput {
  serviceType: SupplierType;
  supplierId: string;
  costPerPerson: string;
  profitPercent: string;
  description?: string;
}

export interface TripInput {
  tourId: string;
  branchId?: string;
  code: string;
  tripType: TripType;
  departureDate: string;
  returnDate?: string;
  currencyCode: string;
  minPassengers: number;
  maxSeats: number;
  registrationDeadline: string;
  isPublic?: boolean;
  notes?: string;
  services?: TripServiceInput[];
}

export type TripWhen = 'upcoming' | 'past' | 'all';

export interface TripQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  branchId?: string;
  tourId?: string;
  status?: TripStatus;
  tripType?: TripType;
  when?: TripWhen;
}

export interface OfferInput {
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: string;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
}

export interface ManifestPassenger {
  id: string;
  bookingId: string;
  fullName: string;
  dateOfBirth: string | null;
  nationality: string | null;
  documentType: DocumentType | null;
  documentNumber: string | null;
  notes: string | null;
  attended: boolean | null;
  sortOrder: number;
  booking: { id: string; reference: string; customer: { fullName: string; phone: string | null } };
}

/** GET /trips/:id/passengers */
export interface TripManifest {
  trip: { id: string; code: string; tour: string; departureDate: string };
  passengers: ManifestPassenger[];
}

/** GET /office (only the fields this module uses) */
export interface OfficeInfo {
  id: string;
  name: string;
  defaultCurrencyCode: string;
  currencies: Array<{
    currencyCode: string;
    currency: { code: string; name: string; nameAr: string | null; symbol: string | null; decimals: number };
  }>;
}

/** GET /branches */
export interface BranchItem {
  id: string;
  name: string;
  city: string | null;
  isMain: boolean;
  isActive: boolean;
}

/** GET /employees */
export interface EmployeeItem {
  id: string;
  jobTitle: string | null;
  isActive: boolean;
  branch: { id: string; name: string } | null;
  role: { id: string; name: string; scope: 'OFFICE' | 'BRANCH' };
  user: { id: string; fullName: string; email: string };
}
