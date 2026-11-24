/**
 * Shapes returned by the public landing-page API (apps/api/src/public-site/public.module.ts).
 * Prices are the full price only (PRC-07); there are never costs or line prices here.
 */
import type { TransportMode, TravelScope } from '@travelos/shared';

export type ServiceKind = 'HOTEL' | 'TRANSPORT' | 'RESTAURANT' | 'OTHER';

export interface NamedCity {
  nameAr: string;
  nameEn: string;
}

export interface PublicCity extends NamedCity {
  id: string;
  country: { nameAr: string; isoCode: string };
}

export interface PublicCategory {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface PublicOfficeInfo {
  name: string;
  nameEn: string | null;
  tagline: string | null;
  about: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  whatsappNumber: string | null;
  whatsappTemplate: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  socialLinks: Record<string, string> | null;
}

export interface PublicBranch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  latitude: string | null;
  longitude: string | null;
  workingHours: string | null;
  city: NamedCity | null;
}

export interface PublicSlide {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkType: 'TRIP' | 'PROGRAM' | 'OFFER' | 'URL' | 'NONE' | string;
  tripId: string | null;
  programId: string | null;
  offerId: string | null;
}

export interface PublicAchievement {
  id: string;
  title: string;
  description: string | null;
  achievedOn: string | null;
  images: { url: string; caption: string | null }[];
}

export interface PublicSite {
  office: PublicOfficeInfo;
  branches: PublicBranch[];
  policies: { slug: string; title: string }[];
  slides: PublicSlide[];
  achievements: PublicAchievement[];
  categories: PublicCategory[];
}

export interface PublicItemOffer {
  id: string;
  title: string;
  discountMode: 'PERCENT' | 'FIXED';
  discountValue: string;
  validTo: string;
}

interface PublicProductBase {
  id: string;
  code: string;
  title: string;
  scope: TravelScope;
  category: PublicCategory;
  coverImageUrl: string | null;
  registrationDeadline: string;
  startsAt: string | null;
  endsAt: string | null;
  currencyCode: string;
  seatsLeft: number;
  services: ServiceKind[];
  transportModes: TransportMode[];
  price: string;
  finalPrice: string;
  offer: PublicItemOffer | null;
}

export interface PublicTrip extends PublicProductBase {
  type: 'TRIP';
  originCity: PublicCity;
  destinationCity: PublicCity;
}

export interface PublicLeg {
  code: string;
  title: string;
  startsAt: string;
  endsAt: string;
  originCity: PublicCity;
  destinationCity: PublicCity;
}

export interface PublicProgram extends PublicProductBase {
  type: 'PROGRAM';
  legs: PublicLeg[];
}

export type PublicProduct = PublicTrip | PublicProgram;

export interface PublicTripDetail extends PublicTrip {
  description: string | null;
  terms: string | null;
  images: { url: string; caption: string | null }[];
  pickupPoints: { pickupTime: string | null; surcharge: string | null; city: NamedCity }[];
  itinerary: {
    startsAt: string | null;
    endsAt: string | null;
    transportMode: TransportMode | null;
    service: { kind: ServiceKind; nameAr: string; nameEn: string };
    item: { name: string; company: { name: string; rating: number | null } };
    fromCity: NamedCity | null;
    toCity: NamedCity | null;
  }[];
  branch: { name: string; whatsapp: string | null; phone: string | null } | null;
}

export interface PublicProgramDetail extends PublicProgram {
  description: string | null;
  terms: string | null;
}

export interface PublicOffer {
  id: string;
  title: string;
  description: string | null;
  kind: 'BUNDLE' | 'DISCOUNT';
  discountMode: 'PERCENT' | 'FIXED' | null;
  discountValue: string | null;
  validFrom: string;
  validTo: string;
  coverImageUrl: string | null;
  terms: string | null;
  price: string | null;
  currencyCode: string | null;
  seatsLeft: number | null;
  services: { kind: ServiceKind; service: string; name: string; company: string; city?: string | null }[];
  targets: { id: string; title: string; code: string; type: 'TRIP' | 'PROGRAM'; price: string; currencyCode: string }[];
}

export interface PublicPolicy {
  slug: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface RequestOptionCompany {
  id: string;
  name: string;
  transportMode: TransportMode | null;
  rating: number | null;
  city: { nameAr: string } | null;
  country: { nameAr: string } | null;
}

export interface RequestOptions {
  services: { id: string; kind: ServiceKind; nameAr: string; nameEn: string; companies: RequestOptionCompany[] }[];
  cities: { id: string; nameAr: string; nameEn: string; kind: string; country: { nameAr: string; isoCode: string } }[];
  categories: PublicCategory[];
  branches: { id: string; name: string }[];
  transportModes: TransportMode[];
  minServices: number;
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Filters of the catalog (LND-04). */
export interface CatalogFilters {
  kind: 'ALL' | 'TRIP' | 'PROGRAM';
  categoryId: string;
  scope: '' | TravelScope;
  destinationCityId: string;
  offersOnly: boolean;
}
