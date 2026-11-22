import { Global, Module } from '@nestjs/common';
import { SupplierAdapterRegistry } from './adapter.registry';
import { IntegrationHttpClient } from './integration-http.client';
import { IntegrationsController } from './integrations.controller';

/**
 * Integration foundation shared by the future HotelIntegrationModule and
 * TransportationIntegrationModule (one adapter each, built from their real API docs).
 */
@Global()
@Module({
  controllers: [IntegrationsController],
  providers: [SupplierAdapterRegistry, IntegrationHttpClient],
  exports: [SupplierAdapterRegistry, IntegrationHttpClient],
})
export class IntegrationsModule {}
