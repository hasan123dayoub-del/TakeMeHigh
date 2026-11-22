/**
 * Provider-neutral contract between Safarni and external supplier systems (hotel, transport).
 *
 * IMPORTANT: no provider adapter exists yet. The hotel and transportation API documentation has
 * not been supplied, so no endpoint, field or auth method is assumed here. Each adapter will map
 * its real API onto these normalised shapes and declare which capabilities it actually supports.
 */

export type IntegrationKind = 'HOTEL' | 'TRANSPORT';

/** What a provider really supports — filled from its documentation, never assumed. */
export interface IntegrationCapabilities {
  search: boolean;
  details: boolean;
  availability: boolean;
  pricing: boolean;
  reserve: boolean;
  getReservation: boolean;
  cancel: boolean;
  /** Provider honours an idempotency key on reserve/cancel (prevents duplicate bookings on retry) */
  idempotentWrites: boolean;
  /** Provider can be polled/queried to reconcile an uncertain (timed-out) reservation */
  reconciliation: boolean;
}

export const NO_CAPABILITIES: IntegrationCapabilities = {
  search: false,
  details: false,
  availability: false,
  pricing: false,
  reserve: false,
  getReservation: false,
  cancel: false,
  idempotentWrites: false,
  reconciliation: false,
};

export interface AvailabilityQuery {
  externalSupplierId: string;
  /** e.g. room type / route / service code in the provider's system */
  externalServiceId?: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  quantity: number; // rooms or seats
}

export interface AvailabilityResult {
  available: boolean;
  remaining?: number;
  unitPrice?: { amount: string; currency: string };
  raw?: never; // raw provider payloads are never passed upward (may contain personal data)
}

export interface ReserveCommand extends AvailabilityQuery {
  idempotencyKey: string;
  /** Passenger data is sent only if the provider requires it, and is never logged */
  guests?: Array<{ fullName: string; documentNumber?: string }>;
}

export type ExternalOutcome =
  | { state: 'CONFIRMED'; externalReference: string; details?: Record<string, unknown> }
  | { state: 'PENDING'; externalReference?: string }
  | { state: 'FAILED'; reason: string; retryable: boolean }
  /** Request may have reached the provider but we got no answer: reconcile, never blind-retry */
  | { state: 'UNKNOWN'; reason: string };

export interface SupplierAdapter {
  readonly kind: IntegrationKind;
  readonly provider: string;
  readonly capabilities: IntegrationCapabilities;
  healthCheck(ctx: AdapterContext): Promise<{ ok: boolean; message?: string }>;
  checkAvailability?(ctx: AdapterContext, q: AvailabilityQuery): Promise<AvailabilityResult>;
  reserve?(ctx: AdapterContext, cmd: ReserveCommand): Promise<ExternalOutcome>;
  getReservation?(ctx: AdapterContext, externalReference: string): Promise<ExternalOutcome>;
  cancel?(ctx: AdapterContext, externalReference: string, idempotencyKey: string): Promise<ExternalOutcome>;
}

/** Per-call context. Credentials are resolved server-side from `credentialRef`, never from the client. */
export interface AdapterContext {
  officeId: string;
  integrationId: string;
  baseUrl: string;
  credentialRef: string | null;
  correlationId: string;
}

// ------------------------------------------------------------------ errors

export class IntegrationError extends Error {
  constructor(
    readonly code:
      | 'NOT_CONFIGURED'
      | 'UNSUPPORTED'
      | 'TIMEOUT'
      | 'UNAVAILABLE'
      | 'RATE_LIMITED'
      | 'UNAUTHORIZED'
      | 'REJECTED'
      | 'BAD_RESPONSE',
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}
