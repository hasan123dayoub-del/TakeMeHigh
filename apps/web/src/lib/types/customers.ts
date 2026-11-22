import type { BookingStatus, TripType } from '@travelos/shared';

/** A customer row (GET /customers/:id profile fields). Phone is unique per office. */
export interface Customer {
  id: string;
  officeId: string;
  fullName: string;
  phone: string;
  nationalId: string | null;
  passportNumber: string | null;
  dateOfBirth: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One balance per currency: SYP and USD are never added together. */
export interface CurrencyAmount {
  currencyCode: string;
  amount: string;
}

/** GET /customers list item */
export interface CustomerListItem extends Customer {
  bookings: number;
  outstanding: CurrencyAmount[];
}

export interface CustomerStatementLine {
  currencyCode: string;
  totalBooked: string;
  netPaid: string;
  refunded: string;
  outstanding: string;
}

export interface CustomerBooking {
  id: string;
  reference: string;
  status: BookingStatus;
  passengerCount: number;
  currencyCode: string;
  totalAmount: string;
  paidAmount: string;
  refundedAmount: string;
  createdAt: string;
  branchId: string;
  trip: {
    id: string;
    code: string;
    departureDate: string;
    tripType: TripType;
    tour: { name: string };
  };
  payments: Array<{
    id: string;
    amount: string;
    currencyCode: string;
    receiptNumber: string;
    paidAt: string;
    refundedAmount: string;
  }>;
  refunds: Array<{
    id: string;
    amount: string;
    currencyCode: string;
    reason: string;
    refundedAt: string;
  }>;
  _count: { passengers: number };
}

/** GET /customers/:id: profile + bookings + statement per currency */
export interface CustomerDetail extends Customer {
  bookings: CustomerBooking[];
  statement: CustomerStatementLine[];
}

/** POST /customers, PATCH /customers/:id */
export interface CustomerInput {
  fullName: string;
  phone: string;
  nationalId?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
}
