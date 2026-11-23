import type { ServiceKind, TransportMode } from '@travelos/shared';

/**
 * One supplier item as normalised by an adapter. Cities are matched to our reference data by their
 * English or Arabic name; unknown cities are reported, never invented.
 */
export interface ExternalItem {
  externalRef: string;
  name: string;
  description?: string;
  fromCity?: string;
  toCity?: string;
  /** Decimal string, e.g. "200000.00" */
  costPerPerson: string;
  currency: string;
  available?: boolean;
  transportMode?: TransportMode;
}

export interface AdapterContext {
  baseUrl: string;
  credentials: { apiKey?: string } & Record<string, string | undefined>;
  /** e.g. the supplier's own id for the company (hotel id, operator id) */
  timeoutMs: number;
}

/**
 * INT-01: every supplier platform is reached through this interface, so adding a supplier means
 * adding an adapter, not touching trips, pricing or bookings.
 */
export interface SupplierAdapter {
  readonly key: string;
  readonly kind: Exclude<ServiceKind, 'OTHER'>;
  readonly label: string;
  health(ctx: AdapterContext): Promise<void>;
  fetchItems(ctx: AdapterContext): Promise<ExternalItem[]>;
}

export class AdapterError extends Error {
  constructor(
    message: string,
    readonly retryable = true,
  ) {
    super(message);
  }
}

async function call(ctx: AdapterContext, path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.timeoutMs); // INT: 10 s timeout
  try {
    const res = await fetch(`${ctx.baseUrl.replace(/\/+$/, '')}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(ctx.credentials.apiKey
          ? { Authorization: `Bearer ${ctx.credentials.apiKey}` }
          : {}),
      },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403)
      throw new AdapterError('The supplier rejected the credentials', false);
    if (!res.ok) throw new AdapterError(`Supplier answered HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof AdapterError) throw e;
    if ((e as Error).name === 'AbortError')
      throw new AdapterError(
        `No answer from the supplier within ${ctx.timeoutMs / 1000} s`,
      );
    throw new AdapterError(`Supplier unreachable: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

const DECIMAL = /^\d{1,12}(\.\d{1,2})?$/;

/**
 * Generic REST contract v1 (docs/integrations/README.md), used until each supplier's own
 * documentation is received (TBD-02):
 *   GET {base}/health         → 200
 *   GET {base}/items          → { items: [{ id, name, description?, from?, to?, price_per_person, currency, available?, mode? }] }
 */
class RestAdapterV1 implements SupplierAdapter {
  constructor(
    readonly key: string,
    readonly kind: SupplierAdapter['kind'],
    readonly label: string,
  ) {}

  async health(ctx: AdapterContext) {
    await call(ctx, '/health');
  }

  async fetchItems(ctx: AdapterContext): Promise<ExternalItem[]> {
    const body = (await call(ctx, '/items')) as { items?: unknown };
    if (!body || !Array.isArray(body.items))
      throw new AdapterError('Unexpected answer: "items" list missing', false);
    return body.items.map((raw, i) => {
      const r = raw as Record<string, unknown>;
      const text = (v: unknown) =>
        typeof v === 'string' || typeof v === 'number' ? String(v) : undefined;
      const price = text(r.price_per_person) ?? '';
      const id = text(r.id);
      const name = text(r.name);
      if (
        !id ||
        !name ||
        !DECIMAL.test(price) ||
        typeof r.currency !== 'string'
      )
        throw new AdapterError(
          `Item #${i + 1} is invalid (id, name, price_per_person, currency are required)`,
          false,
        );
      return {
        externalRef: id,
        name: name.slice(0, 160),
        description: text(r.description)?.slice(0, 500),
        fromCity: text(r.from),
        toCity: text(r.to),
        costPerPerson: price,
        currency: r.currency.toUpperCase(),
        available: typeof r.available === 'boolean' ? r.available : undefined,
        transportMode: ['LAND', 'SEA', 'AIR'].includes(text(r.mode) ?? '')
          ? (r.mode as TransportMode)
          : undefined,
      };
    });
  }
}

export const ADAPTERS: SupplierAdapter[] = [
  new RestAdapterV1('hotel-rest-v1', 'HOTEL', 'Hotel platform — REST v1'),
  new RestAdapterV1(
    'transport-rest-v1',
    'TRANSPORT',
    'Transport platform — REST v1',
  ),
  new RestAdapterV1(
    'restaurant-rest-v1',
    'RESTAURANT',
    'Restaurant platform — REST v1',
  ),
];

export const adapterFor = (key: string) => ADAPTERS.find((a) => a.key === key);
