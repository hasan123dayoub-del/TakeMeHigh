import type { SupplierType, TripStatus } from '@travelos/shared';

export type IntegrationStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'ACTIVE' | 'ERROR' | 'DISABLED';

/** Row of GET /suppliers */
export interface SupplierListItem {
  id: string;
  officeId: string;
  type: SupplierType;
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Number of trips this supplier serves */
  trips: number;
  integration: {
    status: IntegrationStatus;
    kind?: string;
    lastHealthOk?: boolean | null;
    lastHealthCheckAt?: string | null;
  };
}

export interface SupplierDue {
  trip: {
    id: string;
    code: string;
    departureDate: string;
    status: TripStatus;
    confirmedSeats: number;
    currencyCode: string;
    tour: { name: string };
  };
  serviceType: SupplierType;
  costPerPerson: string;
  passengers: number;
  currencyCode: string;
  due: string;
  paid: string;
  remaining: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  tripId: string | null;
  amount: string;
  currencyCode: string;
  method: string;
  reference: string | null;
  paidAt: string;
  notes: string | null;
  createdAt: string;
  trip: { code: string } | null;
  recordedBy: { user: { fullName: string } } | null;
}

/** GET /suppliers/:id */
export interface SupplierDetail extends Omit<SupplierListItem, 'trips' | 'integration'> {
  integration: {
    status: IntegrationStatus;
    kind: string;
    externalSupplierId: string | null;
    lastHealthOk: boolean | null;
    lastHealthCheckAt: string | null;
    lastError: string | null;
  } | null;
  payments: SupplierPayment[];
  dues: SupplierDue[];
}

export interface SupplierInput {
  type: SupplierType;
  name: string;
  contactName?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
  isActive?: boolean;
}

export interface SupplierQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: SupplierType;
  active?: 'true' | 'false';
}

export interface SupplierPaymentInput {
  tripId?: string;
  amount: string;
  currencyCode: string;
  paidAt?: string;
  reference?: string;
  notes?: string;
}

/** GET /suppliers/:id/integration (never contains secrets) */
export interface SupplierIntegrationView {
  supplier: { id: string; name: string; type: SupplierType };
  adapterAvailable: boolean;
  integration: {
    id?: string;
    kind?: string;
    status: IntegrationStatus;
    externalSupplierId?: string | null;
    baseUrl?: string | null;
    /** Name of the server-side secret, never its value */
    credentialRef?: string | null;
    lastHealthCheckAt?: string | null;
    lastHealthOk?: boolean | null;
    lastError?: string | null;
  };
}

export interface IntegrationConfigInput {
  externalSupplierId?: string;
  baseUrl?: string;
  credentialRef?: string;
  enabled?: boolean;
}

/** POST /suppliers/:id/integration/health */
export interface IntegrationHealthResult {
  ok: boolean;
  status: string;
  message?: string;
}
