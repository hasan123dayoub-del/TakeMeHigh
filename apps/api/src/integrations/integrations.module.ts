import { Global, Module } from '@nestjs/common';
import { SupplierAdapterRegistry } from './adapter.registry';
import { IntegrationHttpClient } from './integration-http.client';

/**
 * Integration foundation shared by the future HotelIntegrationModule and
 * TransportationIntegrationModule (one adapter each, built from their real API docs).
 */
@Global()
@Module({
  providers: [SupplierAdapterRegistry, IntegrationHttpClient],
  exports: [SupplierAdapterRegistry, IntegrationHttpClient],
})
export class IntegrationsModule {}
