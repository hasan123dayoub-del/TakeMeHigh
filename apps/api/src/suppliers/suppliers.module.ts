import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags, OmitType, PartialType } from '@nestjs/swagger';
import { PROFIT_MODES, SERVICE_KINDS, TRANSPORT_MODES, type ProfitMode, type ServiceKind, type TransportMode } from '@travelos/shared';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuditService, diff } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ilike, orderArgs, pageArgs, paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { ExportService, ExportSpec, MONEY_FMT, num } from '../common/export/export.service';
import { D, toMoney } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';

const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);
const MODE_AR: Record<TransportMode, string> = { LAND: 'برّي', SEA: 'بحري', AIR: 'جوّي' };

// ------------------------------------------------------------------ DTOs

export class ServiceDto {
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{2,39}$/) code!: string;
  @IsIn(SERVICE_KINDS) kind!: ServiceKind;
  @IsString() @MinLength(2) @MaxLength(80) nameAr!: string;
  @IsString() @MinLength(2) @MaxLength(80) nameEn!: string;
}
export class UpdateServiceDto extends PartialType(OmitType(ServiceDto, ['code', 'kind'] as const)) {}
export class ActiveDto {
  @IsBoolean() isActive!: boolean;
}

export class CompanyDto {
  @IsUUID() serviceId!: string;
  @IsUUID() countryId!: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  /** Required for TRANSPORT companies (SUP-03) */
  @IsOptional() @IsIn(TRANSPORT_MODES) transportMode?: TransportMode;
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(190) email?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
}
export class UpdateCompanyDto extends PartialType(OmitType(CompanyDto, ['serviceId'] as const)) {}

export class CompanyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional({ enum: SERVICE_KINDS }) @IsOptional() @IsIn(SERVICE_KINDS) serviceKind?: ServiceKind;
  @ApiPropertyOptional({ enum: TRANSPORT_MODES }) @IsOptional() @IsIn(TRANSPORT_MODES) transportMode?: TransportMode;
  @ApiPropertyOptional() @IsOptional() @IsUUID() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;
}

const money = () => Matches(/^\d{1,12}(\.\d{1,2})?$/, { message: 'must be an amount with up to 2 decimals' });

export class ItemDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() fromCityId?: string;
  @IsOptional() @IsUUID() toCityId?: string;
  @IsString() @money() costPerPerson!: string;
  @IsString() @Length(3, 3) currencyCode!: string;
}
export class UpdateItemDto extends PartialType(ItemDto) {}

export class ItemQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
}

export class ProfitRuleDto {
  @IsUUID() serviceId!: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsIn(PROFIT_MODES) mode!: ProfitMode;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000_000) value!: number;
}

// ------------------------------------------------------------------ shapes & exports

const companyInclude = {
  service: { select: { id: true, code: true, kind: true, nameAr: true, nameEn: true } },
  country: { select: { id: true, nameAr: true, nameEn: true, isoCode: true } },
  city: { select: { id: true, nameAr: true, nameEn: true } },
  integration: { select: { id: true, status: true, lastSuccessAt: true, lastError: true } },
  _count: { select: { items: true } },
} satisfies Prisma.CompanyInclude;
type CompanyRow = Prisma.CompanyGetPayload<{ include: typeof companyInclude }>;

const COMPANIES_EXPORT: ExportSpec<CompanyRow> = {
  filename: 'companies',
  title: 'الشركات',
  columns: [
    { header: 'الشركة', value: (c) => c.name, width: 28 },
    { header: 'الخدمة', value: (c) => c.service.nameAr },
    { header: 'نوع النقل', value: (c) => (c.transportMode ? MODE_AR[c.transportMode] : '') },
    { header: 'الدولة', value: (c) => c.country.nameAr },
    { header: 'المدينة', value: (c) => c.city?.nameAr },
    { header: 'المسؤول', value: (c) => c.contactName },
    { header: 'الهاتف', value: (c) => c.phone },
    { header: 'التكامل', value: (c) => (c.integration ? c.integration.status : 'يدوي') },
    { header: 'عدد البنود', value: (c) => c._count.items },
    { header: 'الحالة', value: (c) => (c.isActive ? 'فعّالة' : 'معطّلة') },
  ],
};

const itemInclude = {
  fromCity: { select: { id: true, nameAr: true, nameEn: true } },
  toCity: { select: { id: true, nameAr: true, nameEn: true } },
  company: { select: { id: true, name: true, transportMode: true, service: { select: { id: true, kind: true, nameAr: true } } } },
} satisfies Prisma.CompanyItemInclude;
type ItemRow = Prisma.CompanyItemGetPayload<{ include: typeof itemInclude }>;

const ITEMS_EXPORT: ExportSpec<ItemRow> = {
  filename: 'company-items',
  title: 'بنود الخدمة',
  columns: [
    { header: 'البند', value: (i) => i.name, width: 30 },
    { header: 'الشركة', value: (i) => i.company.name, width: 24 },
    { header: 'من', value: (i) => i.fromCity?.nameAr },
    { header: 'إلى', value: (i) => i.toCity?.nameAr },
    { header: 'الكلفة للشخص', value: (i) => num(i.costPerPerson), numFmt: MONEY_FMT },
    { header: 'العملة', value: (i) => i.currencyCode, width: 8 },
    { header: 'المصدر', value: (i) => (i.source === 'INTEGRATION' ? 'تكامل' : 'يدوي') },
    { header: 'آخر مزامنة', value: (i) => i.lastSyncedAt },
    { header: 'الحالة', value: (i) => (i.isActive ? 'فعّال' : 'معطّل') },
  ],
};

/** Trips and offers that still take bookings: flagged when a supplier cost they use changes (INT-07). */
export async function flagCostChange(tx: Tx, itemIds: string[]) {
  if (!itemIds.length) return 0;
  const res = await tx.trip.updateMany({
    where: { status: { in: ['DRAFT', 'OPEN'] }, lines: { some: { companyItemId: { in: itemIds } } } },
    data: { costChangedAt: new Date() },
  });
  return res.count;
}

// ------------------------------------------------------------------ service

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------- services (SUP-01)
  services() {
    return this.prisma.service.findMany({ include: { _count: { select: { companies: true } } }, orderBy: { createdAt: 'asc' } });
  }

  async createService(user: AuthUser, dto: ServiceDto) {
    if (dto.kind !== 'OTHER') throw new BadRequestException('Hotel, transport and restaurant already exist; new services use kind OTHER');
    const s = await this.prisma.service.create({ data: dto });
    await this.audit.log(user, { action: 'service.created', entityType: 'service', entityId: s.id, summary: `Service ${s.nameEn} added` });
    return s;
  }

  async updateService(user: AuthUser, id: string, dto: UpdateServiceDto) {
    const s = await this.prisma.service.update({ where: { id }, data: dto });
    await this.audit.log(user, { action: 'service.updated', entityType: 'service', entityId: id, summary: `Service ${s.nameEn} updated`, changes: { after: dto } });
    return s;
  }

  async setServiceActive(user: AuthUser, id: string, isActive: boolean) {
    const s = await this.prisma.service.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Service not found');
    if (s.isSystem && !isActive) throw new BadRequestException('Hotel, transport and restaurant are core services and stay active');
    const updated = await this.prisma.service.update({ where: { id }, data: { isActive } });
    await this.audit.log(user, { action: isActive ? 'service.enabled' : 'service.disabled', entityType: 'service', entityId: id, summary: `Service ${s.nameEn} ${isActive ? 'enabled' : 'disabled'}` });
    return updated;
  }

  // ---------------- companies (SUP-02..04, SUP-07)
  async companies(q: CompanyQueryDto) {
    const where: Prisma.CompanyWhereInput = {
      ...(q.serviceId ? { serviceId: q.serviceId } : {}),
      ...(q.serviceKind ? { service: { kind: q.serviceKind } } : {}),
      ...(q.transportMode ? { transportMode: q.transportMode } : {}),
      ...(q.countryId ? { countryId: q.countryId } : {}),
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.search ? { OR: [{ name: ilike(q.search) }, { contactName: ilike(q.search) }, { phone: { contains: q.search } }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({ where, include: companyInclude, orderBy: orderArgs(q, ['name', 'createdAt'] as const, 'name'), ...pageArgs(q) }),
      this.prisma.company.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async company(id: string) {
    const c = await this.prisma.company.findUnique({ where: { id }, include: { ...companyInclude, profitRules: true } });
    if (!c) throw new NotFoundException('Company not found');
    return c;
  }

  async createCompany(user: AuthUser, dto: CompanyDto) {
    const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, isActive: true } });
    if (!service) throw new NotFoundException('Service not found or disabled');
    this.assertTransportMode(service.kind, dto.transportMode);
    await this.assertPlace(dto.countryId, dto.cityId);
    const c = await this.prisma.company.create({ data: { ...dto, transportMode: service.kind === 'TRANSPORT' ? dto.transportMode : null }, include: companyInclude });
    await this.audit.log(user, { action: 'company.created', entityType: 'company', entityId: c.id, summary: `${service.nameEn} company "${c.name}" added`, changes: { after: dto } });
    return c;
  }

  async updateCompany(user: AuthUser, id: string, dto: UpdateCompanyDto) {
    const before = await this.company(id);
    if (dto.transportMode !== undefined) this.assertTransportMode(before.service.kind, dto.transportMode);
    if (dto.countryId || dto.cityId) await this.assertPlace(dto.countryId ?? before.countryId, dto.cityId ?? before.cityId ?? undefined);
    const c = await this.prisma.company.update({ where: { id }, data: dto, include: companyInclude });
    await this.audit.log(user, { action: 'company.updated', entityType: 'company', entityId: id, summary: `Company "${c.name}" updated`, changes: diff(before as never, dto as never) });
    return c;
  }

  /** Deactivated companies disappear from selectors; existing trips keep their snapshot (SUP-07). */
  async setCompanyActive(user: AuthUser, id: string, isActive: boolean) {
    const c = await this.prisma.company.update({ where: { id }, data: { isActive }, include: companyInclude });
    await this.audit.log(user, { action: isActive ? 'company.activated' : 'company.deactivated', entityType: 'company', entityId: id, summary: `Company "${c.name}" ${isActive ? 'activated' : 'deactivated'}` });
    return c;
  }

  async deleteCompany(user: AuthUser, id: string) {
    const c = await this.company(id);
    const used = await this.prisma.companyItem.count({ where: { companyId: id, OR: [{ tripLines: { some: {} } }, { offerLines: { some: {} } }] } });
    const requested = await this.prisma.customTripRequestItem.count({ where: { companyId: id } });
    if (used || requested) throw new ConflictException('This company is used by trips, offers or requests; deactivate it instead (SUP-07)');
    await this.prisma.$transaction([this.prisma.companyItem.deleteMany({ where: { companyId: id } }), this.prisma.company.delete({ where: { id } })]);
    await this.audit.log(user, { action: 'company.deleted', entityType: 'company', entityId: id, summary: `Company "${c.name}" deleted` });
    return { deleted: true };
  }

  // ---------------- items (SUP-05, SUP-06)
  async items(companyId: string, q: ItemQueryDto) {
    await this.company(companyId);
    const where: Prisma.CompanyItemWhereInput = {
      companyId,
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.currencyCode ? { currencyCode: q.currencyCode } : {}),
      ...(q.search ? { OR: [{ name: ilike(q.search) }, { description: ilike(q.search) }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.companyItem.findMany({ where, include: itemInclude, orderBy: orderArgs(q, ['name', 'costPerPerson', 'createdAt'] as const, 'name'), ...pageArgs(q) }),
      this.prisma.companyItem.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async createItem(user: AuthUser, companyId: string, dto: ItemDto) {
    const company = await this.company(companyId);
    await this.assertItemPlaces(company.service.kind, dto);
    await this.assertCurrency(dto.currencyCode);
    const item = await this.prisma.companyItem.create({
      data: { ...dto, companyId, costPerPerson: toMoney(dto.costPerPerson), source: 'MANUAL' },
      include: itemInclude,
    });
    await this.audit.log(user, { action: 'item.created', entityType: 'company_item', entityId: item.id, summary: `Item "${item.name}" added to ${company.name}`, changes: { after: dto } });
    return item;
  }

  async updateItem(user: AuthUser, itemId: string, dto: UpdateItemDto) {
    const before = await this.prisma.companyItem.findUnique({ where: { id: itemId }, include: { company: { include: { service: true } } } });
    if (!before) throw new NotFoundException('Item not found');
    if (before.source === 'INTEGRATION' && (dto.costPerPerson !== undefined || dto.currencyCode !== undefined))
      throw new BadRequestException('The cost of an integration item comes from the supplier and cannot be edited (SUP-06)');
    await this.assertItemPlaces(before.company.service.kind, { fromCityId: dto.fromCityId ?? before.fromCityId ?? undefined, toCityId: dto.toCityId ?? before.toCityId ?? undefined });
    if (dto.currencyCode) await this.assertCurrency(dto.currencyCode);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.companyItem.update({ where: { id: itemId }, data: { ...dto, costPerPerson: dto.costPerPerson ? toMoney(dto.costPerPerson) : undefined }, include: itemInclude });
      const costChanged = dto.costPerPerson !== undefined && !D(dto.costPerPerson).eq(before.costPerPerson);
      const flagged = costChanged ? await flagCostChange(tx, [itemId]) : 0;
      await this.audit.log(user, { action: 'item.updated', entityType: 'company_item', entityId: itemId, summary: `Item "${item.name}" updated${flagged ? ` (${flagged} trip(s) flagged for review)` : ''}`, changes: diff(before as never, dto as never) }, tx);
      return item;
    });
  }

  async setItemActive(user: AuthUser, itemId: string, isActive: boolean) {
    const item = await this.prisma.companyItem.update({ where: { id: itemId }, data: { isActive }, include: itemInclude });
    await this.audit.log(user, { action: isActive ? 'item.activated' : 'item.deactivated', entityType: 'company_item', entityId: itemId, summary: `Item "${item.name}" ${isActive ? 'activated' : 'deactivated'}` });
    return item;
  }

  async deleteItem(user: AuthUser, itemId: string) {
    const item = await this.prisma.companyItem.findUnique({ where: { id: itemId }, include: { _count: { select: { tripLines: true, offerLines: true } } } });
    if (!item) throw new NotFoundException('Item not found');
    if (item._count.tripLines || item._count.offerLines) throw new ConflictException('This item is used by trips or offers; deactivate it instead (SUP-07)');
    await this.prisma.companyItem.delete({ where: { id: itemId } });
    await this.audit.log(user, { action: 'item.deleted', entityType: 'company_item', entityId: itemId, summary: `Item "${item.name}" deleted` });
    return { deleted: true };
  }

  /**
   * Items to pick when building a trip or offer: active items of active companies of a service,
   * optionally filtered by transport mode, currency and route (TRP-07).
   */
  async catalog(params: { serviceId?: string; transportMode?: TransportMode; currencyCode?: string; fromCityId?: string; toCityId?: string; companyId?: string }) {
    return this.prisma.companyItem.findMany({
      where: {
        isActive: true,
        company: {
          isActive: true,
          ...(params.serviceId ? { serviceId: params.serviceId } : {}),
          ...(params.transportMode ? { transportMode: params.transportMode } : {}),
          ...(params.companyId ? { id: params.companyId } : {}),
        },
        ...(params.currencyCode ? { currencyCode: params.currencyCode } : {}),
        ...(params.fromCityId ? { fromCityId: params.fromCityId } : {}),
        ...(params.toCityId ? { toCityId: params.toCityId } : {}),
      },
      include: itemInclude,
      orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
      take: 500,
    });
  }

  // ---------------- profit rules (PRC-02)
  profitRules() {
    return this.prisma.profitRule.findMany({
      include: { service: { select: { id: true, nameAr: true, nameEn: true, kind: true } }, company: { select: { id: true, name: true } } },
      orderBy: [{ service: { createdAt: 'asc' } }, { companyId: { sort: 'asc', nulls: 'first' } }],
    });
  }

  async upsertProfitRule(user: AuthUser, dto: ProfitRuleDto) {
    if (dto.mode === 'PERCENT' && dto.value > 1000) throw new BadRequestException('A percentage above 1000% looks like a mistake');
    if (dto.companyId) {
      const company = await this.company(dto.companyId);
      if (company.serviceId !== dto.serviceId) throw new BadRequestException('The company does not provide this service');
    }
    const existing = await this.prisma.profitRule.findFirst({ where: { serviceId: dto.serviceId, companyId: dto.companyId ?? null } });
    const data = { serviceId: dto.serviceId, companyId: dto.companyId ?? null, mode: dto.mode, value: toMoney(dto.value) };
    const rule = existing ? await this.prisma.profitRule.update({ where: { id: existing.id }, data }) : await this.prisma.profitRule.create({ data });
    await this.audit.log(user, { action: 'profit_rule.saved', entityType: 'profit_rule', entityId: rule.id, summary: `Default profit set to ${dto.value}${dto.mode === 'PERCENT' ? '%' : ''}`, changes: { before: existing, after: data } });
    return rule;
  }

  async deleteProfitRule(user: AuthUser, id: string) {
    await this.prisma.profitRule.delete({ where: { id } });
    await this.audit.log(user, { action: 'profit_rule.deleted', entityType: 'profit_rule', entityId: id, summary: 'Default profit rule removed' });
    return { deleted: true };
  }

  /** Company rule, else service rule, else 0% (PRC-02). */
  async defaultProfit(db: Tx | PrismaService, serviceId: string, companyId: string): Promise<{ mode: ProfitMode; value: string }> {
    const rules = await db.profitRule.findMany({ where: { serviceId, OR: [{ companyId }, { companyId: null }] } });
    const rule = rules.find((r) => r.companyId === companyId) ?? rules.find((r) => r.companyId === null);
    return rule ? { mode: rule.mode, value: rule.value.toString() } : { mode: 'PERCENT', value: '0' };
  }

  // ---------------- validation helpers
  private assertTransportMode(kind: ServiceKind | string, mode: TransportMode | null | undefined) {
    if (kind === 'TRANSPORT' && !mode) throw new BadRequestException('Choose land, sea or air for a transport company (SUP-03)');
    if (kind !== 'TRANSPORT' && mode) throw new BadRequestException('Only transport companies have a transport mode (SUP-03)');
  }

  private async assertItemPlaces(kind: string, dto: { fromCityId?: string; toCityId?: string }) {
    if (kind === 'TRANSPORT') {
      if (!dto.fromCityId || !dto.toCityId) throw new BadRequestException('A transport item needs a departure and an arrival city');
      if (dto.fromCityId === dto.toCityId) throw new BadRequestException('Departure and arrival must be different cities');
    } else if (dto.fromCityId) {
      throw new BadRequestException('Only transport items have a departure city; use the arrival/location city');
    }
    const ids = [dto.fromCityId, dto.toCityId].filter(Boolean) as string[];
    if (ids.length) {
      const found = await this.prisma.city.count({ where: { id: { in: ids }, isActive: true } });
      if (found !== new Set(ids).size) throw new NotFoundException('City not found or disabled');
    }
  }

  private async assertPlace(countryId: string, cityId?: string) {
    const country = await this.prisma.country.findFirst({ where: { id: countryId, isActive: true } });
    if (!country) throw new NotFoundException('Country not found or disabled');
    if (cityId && !(await this.prisma.city.findFirst({ where: { id: cityId, countryId, isActive: true } })))
      throw new BadRequestException('The city does not belong to the chosen country');
  }

  private async assertCurrency(code: string) {
    if (!(await this.prisma.currency.findUnique({ where: { code } }))) throw new NotFoundException('Unknown currency');
  }
}

// ------------------------------------------------------------------ controller

/** PRC-06: supplier costs are visible only with pricing.view_breakdown (Admin by default). */
function maskCost<T extends { costPerPerson: unknown }>(user: AuthUser, rows: T[]): T[] {
  if (user.permissions.includes('pricing.view_breakdown')) return rows;
  return rows.map((r) => ({ ...r, costPerPerson: null }));
}

export class CatalogQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional({ enum: TRANSPORT_MODES }) @IsOptional() @IsIn(TRANSPORT_MODES) transportMode?: TransportMode;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 3) currencyCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() fromCityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() toCityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() companyId?: string;
}

@ApiTags('Services, companies & items')
@ApiBearerAuth()
@Controller()
export class SuppliersController {
  constructor(
    private readonly suppliers: SuppliersService,
    private readonly exporter: ExportService,
  ) {}

  @Get('services')
  @RequirePermissions('companies.view')
  services() {
    return this.suppliers.services();
  }

  @Post('services')
  @RequirePermissions('services.manage')
  createService(@CurrentUser() user: AuthUser, @Body() dto: ServiceDto) {
    return this.suppliers.createService(user, dto);
  }

  @Patch('services/:id')
  @RequirePermissions('services.manage')
  updateService(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceDto) {
    return this.suppliers.updateService(user, id, dto);
  }

  @Patch('services/:id/active')
  @RequirePermissions('services.manage')
  setServiceActive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ActiveDto) {
    return this.suppliers.setServiceActive(user, id, dto.isActive);
  }

  @Get('companies')
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'Companies, filterable by service and transport mode (SUP-04). Supports export=xlsx|all.' })
  async companies(@CurrentUser() user: AuthUser, @Query() q: CompanyQueryDto) {
    return this.exporter.respond(q, await this.suppliers.companies(q), COMPANIES_EXPORT, user);
  }

  @Get('companies/:id')
  @RequirePermissions('companies.view')
  company(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.company(id);
  }

  @Post('companies')
  @RequirePermissions('companies.manage')
  createCompany(@CurrentUser() user: AuthUser, @Body() dto: CompanyDto) {
    return this.suppliers.createCompany(user, dto);
  }

  @Patch('companies/:id')
  @RequirePermissions('companies.manage')
  updateCompany(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCompanyDto) {
    return this.suppliers.updateCompany(user, id, dto);
  }

  @Patch('companies/:id/active')
  @RequirePermissions('companies.manage')
  setCompanyActive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ActiveDto) {
    return this.suppliers.setCompanyActive(user, id, dto.isActive);
  }

  @Delete('companies/:id')
  @RequirePermissions('companies.manage')
  @ApiOperation({ summary: 'Delete an unused company (otherwise deactivate, SUP-07)' })
  deleteCompany(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.deleteCompany(user, id);
  }

  @Get('companies/:id/items')
  @RequirePermissions('companies.view')
  async items(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() q: ItemQueryDto) {
    const page = await this.suppliers.items(id, q);
    return this.exporter.respond(q, { ...page, data: maskCost(user, page.data) }, ITEMS_EXPORT, user);
  }

  @Post('companies/:id/items')
  @RequirePermissions('companies.manage')
  createItem(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ItemDto) {
    return this.suppliers.createItem(user, id, dto);
  }

  @Patch('items/:id')
  @RequirePermissions('companies.manage')
  updateItem(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.suppliers.updateItem(user, id, dto);
  }

  @Patch('items/:id/active')
  @RequirePermissions('companies.manage')
  setItemActive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ActiveDto) {
    return this.suppliers.setItemActive(user, id, dto.isActive);
  }

  @Delete('items/:id')
  @RequirePermissions('companies.manage')
  deleteItem(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.deleteItem(user, id);
  }

  @Get('catalog')
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'Bookable items of active companies, by service / transport mode / currency / route (TRP-07)' })
  async catalog(@CurrentUser() user: AuthUser, @Query() q: CatalogQueryDto) {
    return maskCost(user, await this.suppliers.catalog(q));
  }

  @Get('profit-rules')
  @RequirePermissions('pricing.set_profit')
  profitRules() {
    return this.suppliers.profitRules();
  }

  @Put('profit-rules')
  @RequirePermissions('pricing.set_profit')
  @ApiOperation({ summary: 'Create or replace the default profit of a service (or a company of it), PRC-02' })
  upsertProfitRule(@CurrentUser() user: AuthUser, @Body() dto: ProfitRuleDto) {
    return this.suppliers.upsertProfitRule(user, dto);
  }

  @Delete('profit-rules/:id')
  @RequirePermissions('pricing.set_profit')
  deleteProfitRule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.deleteProfitRule(user, id);
  }
}

@Module({ controllers: [SuppliersController], providers: [SuppliersService], exports: [SuppliersService] })
export class SuppliersModule {}
