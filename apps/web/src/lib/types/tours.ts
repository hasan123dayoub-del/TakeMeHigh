import type { TripStatus, TripType } from '@travelos/shared';

/** GET /tour-categories (with tour count) */
export interface TourCategory {
  id: string;
  officeId: string;
  name: string;
  nameAr: string | null;
  createdAt: string;
  _count?: { tours: number };
}

export interface TourDay {
  id?: string;
  tourId?: string;
  dayNumber: number;
  title: string;
  description: string | null;
  location: string | null;
}

export interface TourImage {
  id?: string;
  url: string;
  caption: string | null;
  sortOrder?: number;
}

/** Row of GET /tours */
export interface TourListItem {
  id: string;
  officeId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  destination: string;
  description: string | null;
  days: number;
  nights: number;
  accommodationInfo: string | null;
  transportationInfo: string | null;
  bookingTerms: string | null;
  cancellationTerms: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: TourCategory | null;
  _count: { trips: number };
}

/** GET /tours/:id */
export interface TourDetail extends Omit<TourListItem, '_count'> {
  itinerary: TourDay[];
  images: TourImage[];
  trips: Array<{
    id: string;
    code: string;
    departureDate: string;
    status: TripStatus;
    tripType: TripType;
    branchId: string;
  }>;
}

export interface TourInput {
  name: string;
  destination: string;
  /** null clears the category (edit) */
  categoryId?: string | null;
  days: number;
  nights: number;
  description?: string | null;
  accommodationInfo?: string | null;
  transportationInfo?: string | null;
  bookingTerms?: string | null;
  cancellationTerms?: string | null;
  coverImageUrl?: string | null;
  isActive?: boolean;
  itinerary?: Array<{ dayNumber: number; title: string; description?: string; location?: string }>;
}

export interface TourQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}
