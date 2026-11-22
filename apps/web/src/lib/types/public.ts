/**
 * Public (no-login) API shapes: `GET /public/showcase`, `/public/offices/:slug`,
 * `/public/offices/:slug/trips/:tripId`. Mirrors `apps/api/src/public-pages`.
 * Money values are decimal strings and always travel with their own currency.
 */
import type { TripType } from '@travelos/shared';

export type ServiceType = 'HOTEL' | 'TRANSPORT' | 'RESTAURANT';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PublicCategory {
  name: string;
  nameAr: string | null;
}

export interface PublicOffer {
  title: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  /** YYYY-MM-DD */
  endsAt: string;
}

export interface TripCardOffice {
  name: string;
  slug: string;
  city: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  whatsapp: string | null;
}

export interface TripCard {
  id: string;
  code: string;
  title: string;
  destination: string;
  category: PublicCategory | null;
  tripType: TripType;
  days: number;
  nights: number;
  /** YYYY-MM-DD */
  departureDate: string;
  returnDate: string;
  registrationClosesOn: string | null;
  coverImageUrl: string | null;
  currencyCode: string;
  price: string;
  priceAfterOffer: string;
  offer: PublicOffer | null;
  seatsAvailable: number;
  includes: ServiceType[];
  office: TripCardOffice;
  /** wa.me link with a prefilled booking message, null when the office has no WhatsApp number. */
  whatsappUrl: string | null;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  office: { name: string; slug: string; logoUrl: string | null; brandColor: string | null };
  tripId: string | null;
  /** Site-relative link: the trip page or the office page. */
  link: string;
}

export interface ShowcaseFacets {
  destinations: string[];
  categories: PublicCategory[];
  tripTypes: TripType[];
}

export interface ShowcaseResponse {
  data: TripCard[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  banners: Banner[];
  facets: ShowcaseFacets;
}

/** Filters of the landing showcase, mirrored in the URL search params. */
export interface ShowcaseFilters {
  destination?: string;
  category?: string;
  tripType?: TripType;
  /** YYYY-MM-DD */
  from?: string;
  to?: string;
  offersOnly?: boolean;
  search?: string;
}

export interface PublicBranch {
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  location: GeoPoint | null;
}

export interface PublicOffice {
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  whatsappUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brandColor: string | null;
  location: GeoPoint | null;
  branches: PublicBranch[];
  bookingTerms: string | null;
  cancellationTerms: string | null;
}

export interface OfficePageResponse {
  office: PublicOffice;
  trips: TripCard[];
  banners: Banner[];
}

export interface TripDetails extends TripCard {
  description: string | null;
  accommodationInfo: string | null;
  transportationInfo: string | null;
  bookingTerms: string | null;
  cancellationTerms: string | null;
  images: { url: string; caption: string | null }[];
  itinerary: { dayNumber: number; title: string; description: string | null; location: string | null }[];
  services: { type: ServiceType; description: string | null }[];
  branch: { name: string; city: string | null; address: string | null; location: GeoPoint | null };
}
