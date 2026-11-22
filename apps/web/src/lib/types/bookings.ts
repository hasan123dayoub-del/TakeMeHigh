import type { BookingStatus, DiscountType, DocumentType, TripStatus, TripType } from '@travelos/shared';
import type { Customer } from './customers';

export type { Paginated } from '@travelos/shared';

/** GET /bookings list item */
export interface BookingListItem {
  id: string;
  branchId: string;
  tripId: string;
  customerId: string;
  reference: string;
  status: BookingStatus;
  passengerCount: number;
  currencyCode: string;
  unitPrice: string;
  subtotal: string;
  offerTitle: string | null;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  refundedAmount: string;
  /** Server-computed: total − paid, 0 for cancelled bookings */
  balance: string;
  createdAt: string;
  trip: { id: string; code: string; departureDate: string; tripType: TripType; tour: { name: string } };
  customer: { id: string; fullName: string; phone: string };
  branch: { id: string; name: string };
}

export interface Passenger {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  nationality: string | null;
  documentType: DocumentType;
  documentNumber: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface Refund {
  id: string;
  paymentId: string;
  bookingId: string;
  amount: string;
  currencyCode: string;
  reason: string;
  refundedAt: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  branchId: string;
  amount: string;
  currencyCode: string;
  method: 'CASH';
  receiptNumber: string;
  paidAt: string;
  notes: string | null;
  refundedAmount: string;
  createdAt: string;
  refunds: Refund[];
  recordedBy: { user: { fullName: string } } | null;
}

export type BookingEventType = 'CREATED' | 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'TRANSFERRED' | 'PASSENGERS_UPDATED';

export interface PriceSnapshot {
  unitPrice: string;
  discount: string;
  total: string;
}

export interface BookingEvent {
  id: string;
  type: BookingEventType;
  fromTripId: string | null;
  toTripId: string | null;
  /** Shape depends on `type` (see BookingsService) */
  data: {
    unitPrice?: string;
    discount?: string;
    offer?: string | null;
    reason?: string | null;
    previousStatus?: BookingStatus;
    from?: number;
    to?: number;
    previous?: PriceSnapshot;
    current?: PriceSnapshot;
  } | null;
  createdAt: string;
  actor: { user: { fullName: string } } | null;
}

export interface ExternalReservation {
  id: string;
  kind: string;
  status: string;
  externalReference: string | null;
  lastError: string | null;
  lastSyncedAt: string | null;
  tripService: { serviceType: string } | null;
}

/** GET /bookings/:id */
export interface BookingDetail extends Omit<BookingListItem, 'trip' | 'customer' | 'branch'> {
  unitCost: string;
  offerId: string | null;
  discountType: DiscountType | null;
  discountValue: string | null;
  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  trip: {
    id: string;
    code: string;
    tripType: TripType;
    departureDate: string;
    returnDate: string;
    status: TripStatus;
    branchId: string;
    maxSeats: number;
    confirmedSeats: number;
    tour: { id: string; name: string; destination: string };
  };
  branch: { id: string; name: string };
  customer: Customer;
  passengers: Passenger[];
  payments: Payment[];
  events: BookingEvent[];
  externalReservations: ExternalReservation[];
  createdBy: { user: { fullName: string } } | null;
}

/** Fields of GET /trips used by the booking flow (trip picker, transfer). */
export interface TripOffer {
  id: string;
  title: string;
  discountType: DiscountType;
  discountValue: string;
  startsAt: string;
  endsAt: string;
}

export interface BookableTrip {
  id: string;
  branchId: string;
  code: string;
  tripType: TripType;
  departureDate: string;
  returnDate: string;
  currencyCode: string;
  maxSeats: number;
  confirmedSeats: number;
  seatsAvailable: number;
  status: TripStatus;
  sellingPricePerPerson: string;
  registrationClosesOn: string | null;
  tour: { id: string; name: string; destination: string; days: number; nights: number };
  branch: { id: string; name: string };
  activeOffer: TripOffer | null;
  pendingBookings?: number;
}

export interface Branch {
  id: string;
  name: string;
  city: string | null;
  isActive: boolean;
}

/** GET /office (print headers) */
export interface OfficeProfile {
  id: string;
  name: string;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  bookingTerms: string | null;
  cancellationTerms: string | null;
}

export interface PassengerInput {
  fullName: string;
  dateOfBirth?: string;
  nationality?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  notes?: string;
}

/** POST /bookings */
export interface CreateBookingInput {
  tripId: string;
  customerId: string;
  passengers: PassengerInput[];
  notes?: string;
  confirm?: boolean;
  waitlistIfFull?: boolean;
  payment?: { amount: string; notes?: string };
}

export interface BookingQuery {
  page: number;
  pageSize: number;
  status?: BookingStatus;
  tripId?: string;
  customerId?: string;
  branchId?: string;
  search?: string;
}
