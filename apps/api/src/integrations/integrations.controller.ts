import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { officeUser } from '../common/scope';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierAdapterRegistry } from './adapter.registry';
import { IntegrationError } from './integration.types';

export class IntegrationConfigDto {
  /** Supplier id inside the external system */
  @IsOptional() @IsString() @MaxLength(120) externalSupplierId?: string;
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  @MaxLength(300)
  baseUrl?: string;
  /**
   * NAME of the server-side secret (environment variable / vault key), e.g. HOTEL_API_KEY_SHAM.
   * The secret value is never sent to or stored by the API.
   */
  @IsOptional()
  @Matches(/^[A-Z][A-Z0-9_]{2,119}$/, {
    message:
      'credentialRef must be an environment variable name like HOTEL_API_KEY_SHAM',
  })
  credentialRef?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

const safeView = {
  id: true,
  kind: true,
  status: true,
  externalSupplierId: true,
  baseUrl: true,
  credentialRef: true, // the name only, never the value
  capabilities: true,
  lastHealthCheckAt: true,
  lastHealthOk: true,
  lastError: true,
} as const;

@ApiTags('Supplier integrations')
@ApiBearerAuth()
@Controller('suppliers/:id/integration')
export class IntegrationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SupplierAdapterRegistry,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('suppliers.manage')
  @ApiOperation({
    summary:
      'Connection settings of a hotel/transport supplier (no secrets are ever returned)',
  })
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const supplier = await this.supplier(user, id);
    const integration = await this.prisma.supplierIntegration.findUnique({
      where: {
        officeId_supplierId: { officeId: supplier.officeId, supplierId: id },
      },
      select: safeView,
    });
    return {
      supplier: { id: supplier.id, name: supplier.name, type: supplier.type },
      adapterAvailable:
        supplier.type !== 'RESTAURANT' &&
        this.registry.isConnected(supplier.type),
      integration: integration ?? { status: 'NOT_CONFIGURED' },
    };
  }

  @Put()
  @RequirePermissions('suppliers.manage')
  @ApiOperation({
    summary:
      'Save connection settings (base URL, external id, secret NAME). Restaurants are manual only.',
  })
  async configure(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IntegrationConfigDto,
  ) {
    const supplier = await this.supplier(user, id);
    if (supplier.type === 'RESTAURANT')
      throw new BadRequestException(
        'Restaurants are managed manually in this version',
      );
    if (
      dto.baseUrl &&
      process.env.NODE_ENV === 'production' &&
      !dto.baseUrl.startsWith('https://')
    ) {
      throw new BadRequestException('Supplier APIs must use HTTPS');
    }
    const kind = supplier.type;
    const status =
      dto.enabled === false
        ? 'DISABLED'
        : dto.baseUrl && dto.credentialRef
          ? 'CONFIGURED'
          : 'NOT_CONFIGURED';
    const saved = await this.prisma.supplierIntegration.upsert({
      where: {
        officeId_supplierId: { officeId: supplier.officeId, supplierId: id },
      },
      create: {
        officeId: supplier.officeId,
        supplierId: id,
        kind,
        status,
        externalSupplierId: dto.externalSupplierId,
        baseUrl: dto.baseUrl,
        credentialRef: dto.credentialRef,
      },
      update: {
        status,
        externalSupplierId: dto.externalSupplierId,
        baseUrl: dto.baseUrl,
        credentialRef: dto.credentialRef,
        lastHealthOk: null,
        lastError: null,
      },
      select: safeView,
    });
    await this.audit.log(user, {
      action: 'integration.configured',
      entityType: 'supplier',
      entityId: id,
      summary: `Updated ${kind.toLowerCase()} integration settings for ${supplier.name}`,
    });
    return saved;
  }

  @Post('health')
  @HttpCode(200)
  @RequirePermissions('suppliers.manage')
  @ApiOperation({
    summary:
      'Check the connection. Reports NOT_CONFIGURED until the provider adapter exists.',
  })
  async health(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const supplier = await this.supplier(user, id);
    const integration = await this.prisma.supplierIntegration.findUnique({
      where: {
        officeId_supplierId: { officeId: supplier.officeId, supplierId: id },
      },
    });
    if (!integration || !integration.baseUrl)
      return {
        ok: false,
        status: 'NOT_CONFIGURED',
        message: 'No connection settings saved for this supplier.',
      };
    try {
      const adapter = this.registry.get(integration.kind);
      const result = await adapter.healthCheck({
        officeId: supplier.officeId,
        integrationId: integration.id,
        baseUrl: integration.baseUrl,
        credentialRef: integration.credentialRef,
        correlationId: randomUUID(),
      });
      await this.prisma.supplierIntegration.update({
        where: { id: integration.id },
        data: {
          lastHealthCheckAt: new Date(),
          lastHealthOk: result.ok,
          lastError: result.ok ? null : result.message?.slice(0, 500),
          status: result.ok ? 'ACTIVE' : 'ERROR',
        },
      });
      return {
        ok: result.ok,
        status: result.ok ? 'ACTIVE' : 'ERROR',
        message: result.message,
      };
    } catch (e) {
      if (e instanceof IntegrationError) {
        // Honest state, never a fake success.
        return { ok: false, status: e.code, message: e.message };
      }
      throw e;
    }
  }

  private async supplier(user: AuthUser, id: string) {
    const s = await this.prisma.supplier.findFirst({
      where: { id, officeId: officeUser(user).officeId },
    });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }
}
