import { Injectable } from '@nestjs/common';
import { IntegrationError, IntegrationKind, SupplierAdapter } from './integration.types';

/**
 * Looks up the adapter for a supplier system.
 *
 * No adapters are registered yet: the HotelIntegrationModule and TransportationIntegrationModule
 * will register theirs once the real API documentation and sandbox credentials are available
 * (see docs/integrations/README.md). Until then every supplier is managed manually and callers
 * receive a clear NOT_CONFIGURED error instead of a fake success.
 */
@Injectable()
export class SupplierAdapterRegistry {
  private readonly adapters = new Map<IntegrationKind, SupplierAdapter>();

  register(adapter: SupplierAdapter) {
    this.adapters.set(adapter.kind, adapter);
  }

  get(kind: IntegrationKind): SupplierAdapter {
    const adapter = this.adapters.get(kind);
    if (!adapter) {
      throw new IntegrationError(
        'NOT_CONFIGURED',
        `No ${kind.toLowerCase()} system is connected yet. This supplier is managed manually.`,
      );
    }
    return adapter;
  }

  isConnected(kind: IntegrationKind) {
    return this.adapters.has(kind);
  }
}
