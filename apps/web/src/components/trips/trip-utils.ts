/**
 * Helpers and local response shapes for the trips module. Shapes missing from the shared
 * `lib/types/api.ts` are declared here (frontend conventions: do not edit the shared file).
 */
import type { ServiceKind, TransportMode, TravelScope } from '@travelos/shared';
import { api } from '@/lib/api';
import type { CompanyItem, Lookups, ManifestPassenger, TripDetail } from '@/lib/types/api';

/** GET /trips/:id also returns the city ids of the frame. */
export interface TripFull extends TripDetail {
  originCityId: string;
  destinationCityId: string;
}

/** GET /catalog item (cost is null/absent for roles without pricing.view_breakdown). */
export type CatalogItem = Omit<CompanyItem, 'costPerPerson'> & { costPerPerson?: string | null };

/** GET /trips/:id/passengers */
export interface Manifest {
  trip: { id: string; code: string; title: string; branchId: string | null };
  total: number;
  passengers: ManifestPassenger[];
}

/** ISO date → value for <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** datetime-local value → ISO (UTC) for the API. */
export function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

/** Whole days between now and a date (negative when past). */
export function daysUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 86_400_000;
}

/** POST /uploads/images (multipart field `file`) → public URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ url: string }>('/uploads/images', form);
  return res.url;
}

/** Travel scope of a frame from the countries of origin and destination (TRP-02, home = SY). */
export function scopeOf(lookups: Lookups | undefined, originCityId: string, destinationCityId: string): TravelScope | null {
  if (!lookups || !originCityId || !destinationCityId) return null;
  const iso = (cityId: string) => {
    const city = lookups.cities.find((c) => c.id === cityId);
    return lookups.countries.find((c) => c.id === city?.countryId)?.isoCode;
  };
  const a = iso(originCityId);
  const b = iso(destinationCityId);
  if (!a || !b) return null;
  return a === 'SY' && b === 'SY' ? 'DOMESTIC' : 'INTERNATIONAL';
}

export const CORE_KINDS: ServiceKind[] = ['TRANSPORT', 'HOTEL', 'RESTAURANT'];
export const TRANSPORT_MODES: TransportMode[] = ['LAND', 'AIR', 'SEA'];

/** Number of decimal digits for an amount input in this currency. */
export const amountPattern = /^\d{1,12}(\.\d{1,2})?$/;
