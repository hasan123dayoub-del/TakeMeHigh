import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import {
  pageArgs,
  paginate,
  PaginationQueryDto,
} from '../common/dto/pagination.dto';
import { decryptSecret, encryptSecret } from '../common/utils/crypto';
import { D, toMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { flagCostChange } from '../suppliers/suppliers.module';
import {
  ADAPTERS,
  AdapterError,
  adapterFor,
  type AdapterContext,
} from './adapters';
import { SandboxSupplierController } from './sandbox.controller';

const TIMEOUT_MS = 10_000;
/** INT-06: costs not refreshed for this long are flagged "outdated". */
const STALE_AFTER_HOURS = 24;
/** Retry back-off after failures: 5, 10, 20, 40… minutes, never more than the normal interval. */
const backoffMinutes = (failures: number) =>
  Math.min(5 * 2 ** Math.max(0, failures - 1), 24 * 60);

export class ConnectionDto {
  @IsIn(ADAPTERS.map((a) => a.key)) adapterKey!: string;
  @IsUrl({
    require_tld: false,
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  @MaxLength(300)
  baseUrl!: string;
  /** Write-only: stored encrypted, never returned (INT-03). Omit to keep the current key. */
  @IsOptional() @IsString() @MinLength(4) @MaxLength(500) apiKey?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  syncIntervalHours?: number;
}

const publicFields = {
  id: true,
  companyId: true,
  adapterKey: true,
  baseUrl: true,
  status: true,
  syncIntervalHours: true,
  lastSyncAt: true,
  lastSuccessAt: true,
  lastError: true,
  consecutiveFailures: true,
  createdAt: true,
  updatedAt: true,
  credentialsEncrypted: false,
} as const;

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger('Integrations');
  private running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  adapters() {
    return ADAPTERS.map(({ key, kind, label }) => ({ key, kind, label }));
  }

  async list() {
    const companies = await this.prisma.company.findMany({
      where: {
        service: { kind: { in: ['HOTEL', 'TRANSPORT', 'RESTAURANT'] } },
      },
      select: {
        id: true,
        name: true,
        transportMode: true,
        isActive: true,
        service: { select: { kind: true, nameAr: true, nameEn: true } },
        integration: {
          select: { ...publicFields, credentialsEncrypted: true },
        },
        _count: { select: { items: { where: { source: 'INTEGRATION' } } } },
      },
      orderBy: [{ service: { createdAt: 'asc' } }, { name: 'asc' }],
    });
    return companies.map(({ integration, ...c }) => ({
      ...c,
      integration: integration
        ? {
            ...integration,
            credentialsEncrypted: undefined,
            hasCredentials: !!integration.credentialsEncrypted,
          }
        : null,
    }));
  }

  async configure(user: AuthUser, companyId: string, dto: ConnectionDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { service: true, integration: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    const adapter = adapterFor(dto.adapterKey)!;
    if (adapter.kind !== company.service.kind)
      throw new BadRequestException(
        `This adapter is for ${adapter.kind} companies`,
      );
    const data = {
      adapterKey: dto.adapterKey,
      baseUrl: dto.baseUrl,
      syncIntervalHours:
        dto.syncIntervalHours ?? company.integration?.syncIntervalHours ?? 6,
      ...(dto.apiKey
        ? {
            credentialsEncrypted: encryptSecret(
              JSON.stringify({ apiKey: dto.apiKey }),
            ),
          }
        : {}),
    };
    const conn = await this.prisma.integrationConnection.upsert({
      where: { companyId },
      create: { companyId, ...data, status: 'NOT_CONFIGURED' },
      update: data,
      select: publicFields,
    });
    await this.audit.log(user, {
      action: 'integration.configured',
      entityType: 'integration',
      entityId: conn.id,
      summary: `Integration for ${company.name} configured (${dto.adapterKey})${dto.apiKey ? ', key replaced' : ''}`,
      changes: {
        after: {
          adapterKey: dto.adapterKey,
          baseUrl: dto.baseUrl,
          syncIntervalHours: data.syncIntervalHours,
        },
      },
    });
    return conn;
  }

  async test(user: AuthUser, companyId: string) {
    const conn = await this.connection(companyId);
    try {
      await adapterFor(conn.adapterKey)!.health(this.context(conn));
      await this.prisma.integrationConnection.update({
        where: { id: conn.id },
        data: { status: 'ACTIVE', lastError: null },
      });
      return { ok: true };
    } catch (e) {
      const message = (e as Error).message.slice(0, 500);
      await this.prisma.integrationConnection.update({
        where: { id: conn.id },
        data: { status: 'ERROR', lastError: message },
      });
      return { ok: false, error: message };
    }
  }

  async setEnabled(user: AuthUser, companyId: string, enabled: boolean) {
    const conn = await this.connection(companyId);
    const updated = await this.prisma.integrationConnection.update({
      where: { id: conn.id },
      data: { status: enabled ? 'NOT_CONFIGURED' : 'DISABLED' },
      select: publicFields,
    });
    await this.audit.log(user, {
      action: enabled ? 'integration.enabled' : 'integration.disabled',
      entityType: 'integration',
      entityId: conn.id,
      summary: `Integration ${enabled ? 'enabled' : 'disabled'}`,
    });
    return updated;
  }

  async logs(companyId: string, q: PaginationQueryDto) {
    const conn = await this.connection(companyId);
    const where = { connectionId: conn.id };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.integrationSyncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        ...pageArgs(q),
      }),
      this.prisma.integrationSyncLog.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  /**
   * Pulls the supplier's items and upserts them by external reference (INT-04). Costs of existing
   * trips/bookings never change (they are snapshots); open trips using a changed cost are flagged
   * for the Admin to review (INT-07). Failures keep the last known costs (INT-06).
   */
  async sync(
    companyId: string,
    trigger: 'SCHEDULED' | 'MANUAL',
    user: AuthUser | null = null,
  ) {
    const conn = await this.connection(companyId);
    if (conn.status === 'DISABLED')
      throw new BadRequestException('The integration is disabled');
    if (this.running.has(conn.id))
      throw new BadRequestException(
        'A sync is already running for this supplier',
      );
    this.running.add(conn.id);
    const startedAt = new Date();
    try {
      const adapter = adapterFor(conn.adapterKey);
      if (!adapter)
        throw new AdapterError(`Unknown adapter ${conn.adapterKey}`, false);
      const external = await adapter.fetchItems(this.context(conn));

      const cities = await this.prisma.city.findMany({
        select: { id: true, nameAr: true, nameEn: true },
      });
      const cityId = (name?: string) => {
        if (!name) return null;
        const n = name.trim().toLowerCase();
        return (
          cities.find(
            (c) => c.nameEn.toLowerCase() === n || c.nameAr === name.trim(),
          )?.id ?? null
        );
      };
      const currencies = new Set(
        (await this.prisma.currency.findMany({ select: { code: true } })).map(
          (c) => c.code,
        ),
      );
      const company = await this.prisma.company.findUniqueOrThrow({
        where: { id: companyId },
        include: { service: true },
      });

      const problems: string[] = [];
      let created = 0;
      let updated = 0;
      const changedIds: string[] = [];
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.companyItem.findMany({
          where: { companyId, source: 'INTEGRATION' },
        });
        const byRef = new Map(existing.map((i) => [i.externalRef, i]));
        const seen = new Set<string>();
        for (const ext of external) {
          const fromCityId = cityId(ext.fromCity);
          const toCityId = cityId(ext.toCity);
          if (!currencies.has(ext.currency)) {
            problems.push(
              `${ext.externalRef}: unknown currency ${ext.currency}`,
            );
            continue;
          }
          if (
            company.service.kind === 'TRANSPORT' &&
            (!fromCityId || !toCityId)
          ) {
            problems.push(
              `${ext.externalRef}: unknown city ${!fromCityId ? ext.fromCity : ext.toCity}`,
            );
            continue;
          }
          seen.add(ext.externalRef);
          const data = {
            name: ext.name,
            description: ext.description ?? null,
            fromCityId:
              company.service.kind === 'TRANSPORT' ? fromCityId : null,
            toCityId,
            costPerPerson: toMoney(ext.costPerPerson),
            currencyCode: ext.currency,
            available: ext.available ?? null,
            lastSyncedAt: new Date(),
            isStale: false,
          };
          const prev = byRef.get(ext.externalRef);
          if (prev) {
            if (
              !D(prev.costPerPerson).eq(D(ext.costPerPerson)) ||
              prev.currencyCode !== ext.currency
            )
              changedIds.push(prev.id);
            await tx.companyItem.update({ where: { id: prev.id }, data });
            updated++;
          } else {
            await tx.companyItem.create({
              data: {
                ...data,
                companyId,
                source: 'INTEGRATION',
                externalRef: ext.externalRef,
              },
            });
            created++;
          }
        }
        // Items the supplier no longer offers: unavailable, kept for history.
        const gone = existing
          .filter((i) => !seen.has(i.externalRef!))
          .map((i) => i.id);
        if (gone.length)
          await tx.companyItem.updateMany({
            where: { id: { in: gone } },
            data: { available: false },
          });
        const flagged = await flagCostChange(tx, changedIds);
        await tx.integrationConnection.update({
          where: { id: conn.id },
          data: {
            status: 'ACTIVE',
            lastSyncAt: new Date(),
            lastSuccessAt: new Date(),
            lastError: problems.length
              ? problems.slice(0, 3).join('; ').slice(0, 500)
              : null,
            consecutiveFailures: 0,
          },
        });
        await tx.integrationSyncLog.create({
          data: {
            connectionId: conn.id,
            trigger,
            result: 'SUCCESS',
            itemsCreated: created,
            itemsUpdated: updated,
            costChanges: changedIds.length,
            error: problems.length ? problems.join('; ').slice(0, 1000) : null,
            startedAt,
            finishedAt: new Date(),
          },
        });
        if (changedIds.length)
          await this.audit.log(
            user,
            {
              action: 'integration.cost_changed',
              entityType: 'integration',
              entityId: conn.id,
              summary: `${company.name}: ${changedIds.length} cost change(s), ${flagged} open trip(s) flagged for review`,
            },
            tx,
          );
      });
      return {
        ok: true,
        created,
        updated,
        costChanges: changedIds.length,
        problems,
      };
    } catch (e) {
      const message = (e as Error).message.slice(0, 500);
      this.logger.warn(`Sync failed for company ${companyId}: ${message}`);
      const failures = conn.consecutiveFailures + 1;
      await this.prisma.$transaction([
        this.prisma.integrationConnection.update({
          where: { id: conn.id },
          data: {
            status: 'ERROR',
            lastSyncAt: new Date(),
            lastError: message,
            consecutiveFailures: failures,
          },
        }),
        this.prisma.integrationSyncLog.create({
          data: {
            connectionId: conn.id,
            trigger,
            result: 'FAILED',
            error: message,
            startedAt,
            finishedAt: new Date(),
          },
        }),
        // INT-06: keep the last known costs but mark them outdated once they are old.
        this.prisma.companyItem.updateMany({
          where: {
            companyId,
            source: 'INTEGRATION',
            OR: [
              { lastSyncedAt: null },
              {
                lastSyncedAt: {
                  lt: new Date(Date.now() - STALE_AFTER_HOURS * 3_600_000),
                },
              },
            ],
          },
          data: { isStale: true },
        }),
      ]);
      return { ok: false, error: message };
    } finally {
      this.running.delete(conn.id);
    }
  }

  /** INT-04: every 10 minutes, sync connections that are due (interval reached, or back-off after failures). */
  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'supplier-sync',
    disabled: process.env.DISABLE_SCHEDULER === 'true',
  })
  async syncDue() {
    const conns = await this.prisma.integrationConnection.findMany({
      where: {
        status: { in: ['ACTIVE', 'ERROR', 'NOT_CONFIGURED'] },
        company: { isActive: true },
      },
    });
    const now = Date.now();
    for (const c of conns) {
      const waitMinutes = c.consecutiveFailures
        ? backoffMinutes(c.consecutiveFailures)
        : c.syncIntervalHours * 60;
      if (c.lastSyncAt && now - c.lastSyncAt.getTime() < waitMinutes * 60_000)
        continue;
      await this.sync(c.companyId, 'SCHEDULED').catch((e: Error) =>
        this.logger.warn(e.message),
      );
    }
  }

  private async connection(companyId: string) {
    const conn = await this.prisma.integrationConnection.findUnique({
      where: { companyId },
    });
    if (!conn)
      throw new NotFoundException('This company has no integration configured');
    return conn;
  }

  private context(conn: {
    baseUrl: string;
    credentialsEncrypted: string | null;
  }): AdapterContext {
    let credentials: AdapterContext['credentials'] = {};
    if (conn.credentialsEncrypted) {
      try {
        credentials = JSON.parse(
          decryptSecret(conn.credentialsEncrypted),
        ) as AdapterContext['credentials'];
      } catch {
        throw new AdapterError(
          'Stored credentials cannot be read; enter the API key again',
          false,
        );
      }
    }
    return { baseUrl: conn.baseUrl, credentials, timeoutMs: TIMEOUT_MS };
  }
}

export class EnableDto {
  @IsBoolean() enabled!: boolean;
}

@ApiTags('Supplier integrations')
@ApiBearerAuth()
@RequirePermissions('integrations.manage')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('adapters')
  adapters() {
    return this.integrations.adapters();
  }

  @Get()
  @ApiOperation({
    summary:
      'Hotel, transport and restaurant companies with their integration status',
  })
  list() {
    return this.integrations.list();
  }

  @Put(':companyId')
  @ApiOperation({
    summary:
      'Configure the connection; the API key is encrypted and never returned (INT-03)',
  })
  configure(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: ConnectionDto,
  ) {
    return this.integrations.configure(user, companyId, dto);
  }

  @Post(':companyId/test')
  @HttpCode(200)
  test(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.integrations.test(user, companyId);
  }

  @Post(':companyId/sync')
  @HttpCode(200)
  @ApiOperation({ summary: '"Sync now" (INT-04)' })
  sync(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.integrations.sync(companyId, 'MANUAL', user);
  }

  @Post(':companyId/enabled')
  @HttpCode(200)
  setEnabled(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: EnableDto,
  ) {
    return this.integrations.setEnabled(user, companyId, dto.enabled);
  }

  @Get(':companyId/logs')
  @ApiOperation({ summary: 'Sync history (INT-05)' })
  logs(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() q: PaginationQueryDto,
  ) {
    return this.integrations.logs(companyId, q);
  }
}

@Module({
  controllers: [IntegrationsController, SandboxSupplierController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
