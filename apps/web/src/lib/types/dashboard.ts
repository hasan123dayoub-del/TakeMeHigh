import type { BookingStatus, TripStatus, TripType } from '@travelos/shared';

/** GET /dashboard (apps/api/src/reports/dashboard.service.ts) */
export interface DashboardData {
  kpis: {
    totalBookings: number;
    pendingBookings: number;
    waitingList: number;
    upcomingTrips: number;
    confirmedPassengers: number;
    availableSeats: number;
  };
  upcomingTrips: DashboardTrip[];
  recentBookings: DashboardBooking[];
  tasks: {
    awaitingDecision: Array<{
      id: string;
      code: string;
      confirmedSeats: number;
      minPassengers: number;
      departureDate: string;
      minimumReached: boolean;
    }>;
    pendingBookings: number;
    waitingList: number;
    registrationClosingSoon: Array<{
      id: string;
      code: string;
      closesOn: string;
      confirmedSeats: number;
      minPassengers: number;
    }>;
  };
  /** Only for roles with `reports.financial`; every amount is per currency (never summed). */
  finance: DashboardFinance | null;
  /** Office-wide roles only; empty for branch roles. */
  recentActivity: Array<{
    id: string;
    action: string;
    summary: string;
    createdAt: string;
    user: { fullName: string } | null;
  }>;
}

export interface DashboardTrip {
  id: string;
  code: string;
  tour: string;
  destination: string;
  branch: string;
  tripType: TripType;
  status: TripStatus;
  departureDate: string;
  registrationClosesOn: string;
  confirmedSeats: number;
  maxSeats: number;
  minPassengers: number;
  occupancyPct: number;
  /** Pending + waiting-list bookings on this trip */
  waiting: number;
}

export interface DashboardBooking {
  id: string;
  reference: string;
  status: BookingStatus;
  customer: string;
  trip: string;
  passengers: number;
  total: string;
  currencyCode: string;
  createdAt: string;
}

export interface CurrencyAmount {
  currencyCode: string;
  amount: string;
}

export interface DashboardFinance {
  collectedTotal: CurrencyAmount[];
  collectedThisMonth: CurrencyAmount[];
  outstanding: CurrencyAmount[];
  expectedProfit: Array<{ currencyCode: string; revenue: string; supplierCost: string; profit: string }>;
  realisedProfit: Array<{ currencyCode: string; collected: string; paidToSuppliers: string; profit: string }>;
}
