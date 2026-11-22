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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { SUPPLIER_TYPES } from '@travelos/shared';
import type { SupplierType } from '@travelos/shared';
import {
  IsBoolean,
  IsDecimal,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { officeUser } from '../common/scope';
import { D, toMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';

export class CreateSupplierDto {
  @IsIn(SUPPLIER_TYPES) type!: SupplierType;
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;
  @IsOptional() @Matches(/^[+\d][\d\s()-]{5,39}$/) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SupplierQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(SUPPLIER_TYPES) type?: SupplierType;
  @IsOptional() @IsIn(['true', 'false']) active?: 'true' | 'false';
}

export class SupplierPaymentDto {
  /** The trip this payment settles (recommended so dues per trip stay accurate) */
  @IsOptional() @IsUUID() tripId?: string;
  @IsDecimal({ decimal_digits: '0,2' }) amount!: string;
  @Length(3, 3) currencyCode!: string;
  @IsOptional() @IsISO8601() paidAt?: string;
  @IsOptional() @IsString() @MaxLength(80) reference?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, q: SupplierQueryDto) {
    const where = {
      officeId: officeUser(user).officeId,
      ...(q.type ? { type: q.type } : {}),
      ...(q.active ? { isActive: q.active === 'true' } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' as const } },
              { city: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        include: {
          integration: {
            select: {
              status: true,
              kind: true,
              lastHealthOk: true,
              lastHealthCheckAt: true,
            },
          },
          _count: { select: { services: true } },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return paginate(
      rows.map(({ _count, integration, ...s }) => ({
        ...s,
        trips: _count.services,
        // Never credentials: only the connection state. Restaurants are always manual.
        integration: integration ?? { status: 'NOT_CONFIGURED' },
      })),
      total,
      q.page,
      q.pageSize,
    );
  }

  /** Supplier profile with, per trip: what the office owes (cost × confirmed passengers), paid, remaining. */
  async get(user: AuthUser, id: string) {
    const { officeId } = officeUser(user);
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, officeId },
      include: {
        integration: {
          select: {
            status: true,
            kind: true,
            externalSupplierId: true,
            lastHealthOk: true,
            lastHealthCheckAt: true,
            lastError: true,
          },
        },
        services: {
          include: {
            trip: {
              select: {
                id: true,
                code: true,
                departureDate: true,
                status: true,
                confirmedSeats: true,
                currencyCode: true,
                tour: { select: { name: true } },
              },
            },
          },
          orderBy: { trip: { departureDate: 'desc' } },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
          include: {
            trip: { select: { code: true } },
            recordedBy: { select: { user: { select: { fullName: true } } } },
          },
        },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const paidByTrip = new Map<string, ReturnType<typeof D>>();
    for (const p of supplier.payments)
      if (p.tripId)
        paidByTrip.set(
          p.tripId,
          (paidByTrip.get(p.tripId) ?? D(0)).add(D(p.amount)),
        );

    const dues = supplier.services
      .filter((s) => s.trip.status !== 'CANCELLED')
      .map((s) => {
        const due = D(s.costPerPerson).mul(s.trip.confirmedSeats);
        const paid = paidByTrip.get(s.trip.id) ?? D(0);
        return {
          trip: s.trip,
          serviceType: s.serviceType,
          costPerPerson: toMoney(s.costPerPerson),
          passengers: s.trip.confirmedSeats,
          currencyCode: s.trip.currencyCode,
          due: toMoney(due),
          paid: toMoney(paid),
          remaining: toMoney(due.sub(paid)),
        };
      });
    return { ...supplier, dues };
  }

  async create(user: AuthUser, dto: CreateSupplierDto) {
    const { officeId } = officeUser(user);
    return this.prisma.$transaction(async (tx) => {
      const s = await tx.supplier.create({ data: { ...dto, officeId } });
      await this.audit.log(
        user,
        {
          action: 'supplier.created',
          entityType: 'supplier',
          entityId: s.id,
          summary: `Added ${dto.type.toLowerCase()} supplier ${dto.name}`,
        },
        tx,
      );
      return s;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateSupplierDto) {
    const s = await this.owned(user, id);
    if (dto.type && dto.type !== s.type) {
      const used = await this.prisma.tripService.count({
        where: { supplierId: id },
      });
      if (used)
        throw new ConflictException(
          'The type of a supplier used in trips cannot change',
        );
    }
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser, id: string) {
    const s = await this.owned(user, id);
    const used = await this.prisma.tripService.count({
      where: { supplierId: id },
    });
    if (used)
      throw new ConflictException(
        'This supplier is used in trips. Deactivate it instead.',
      );
    await this.prisma.supplier.delete({ where: { id } });
    await this.audit.log(user, {
      action: 'supplier.deleted',
      entityType: 'supplier',
      entityId: id,
      summary: `Deleted supplier ${s.name}`,
    });
    return { deleted: true };
  }

  /**
   * Records money the office paid a supplier (e.g. the coach company's net share).
   * With a trip: same currency as the trip, and never more than the most the office could owe
   * (cost per person × maximum seats). Open decision: whether advances above current dues are allowed.
   */
  async pay(user: AuthUser, supplierId: string, dto: SupplierPaymentDto) {
    const u = officeUser(user);
    const supplier = await this.owned(user, supplierId);
    const amount = D(dto.amount);
    if (amount.lte(0))
      throw new BadRequestException('Amount must be greater than zero');
    const currency = dto.currencyCode.toUpperCase();

    if (dto.tripId) {
      const service = await this.prisma.tripService.findFirst({
        where: { tripId: dto.tripId, supplierId, officeId: u.officeId },
        include: { trip: true },
      });
      if (!service)
        throw new BadRequestException(
          'This supplier does not provide a service on that trip',
        );
      if (currency !== service.trip.currencyCode)
        throw new BadRequestException(
          `Payments for trip ${service.trip.code} must be in ${service.trip.currencyCode}`,
        );
      const paid = await this.prisma.supplierPayment.aggregate({
        where: { tripId: dto.tripId, supplierId },
        _sum: { amount: true },
      });
      const ceiling = D(service.costPerPerson)
        .mul(service.trip.maxSeats)
        .sub(D(paid._sum.amount));
      if (amount.gt(ceiling))
        throw new BadRequestException(
          `This would exceed the maximum owed for this trip (${toMoney(ceiling)} ${currency} left)`,
        );
    } else if (
      !(await this.prisma.officeCurrency.findUnique({
        where: {
          officeId_currencyCode: {
            officeId: u.officeId,
            currencyCode: currency,
          },
        },
      }))
    ) {
      throw new BadRequestException(
        `The office does not work with ${currency}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          officeId: u.officeId,
          supplierId,
          tripId: dto.tripId,
          amount: toMoney(amount),
          currencyCode: currency,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          reference: dto.reference,
          notes: dto.notes,
          recordedById: u.memberId,
        },
      });
      await this.audit.log(
        user,
        {
          action: 'supplier.paid',
          entityType: 'supplier',
          entityId: supplierId,
          summary: `Paid ${toMoney(amount)} ${currency} to ${supplier.name}`,
          metadata: { tripId: dto.tripId },
        },
        tx,
      );
      return payment;
    });
  }

  private async owned(user: AuthUser, id: string) {
    const s = await this.prisma.supplier.findFirst({
      where: { id, officeId: officeUser(user).officeId },
    });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }
}

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermissions('suppliers.view')
  @ApiOperation({
    summary:
      'Hotels, transport companies and restaurants with integration status (never secrets)',
  })
  list(@CurrentUser() user: AuthUser, @Query() q: SupplierQueryDto) {
    return this.suppliers.list(user, q);
  }

  @Get(':id')
  @RequirePermissions('suppliers.view')
  @ApiOperation({
    summary:
      'Supplier with trips served, dues (cost × confirmed passengers), paid and remaining',
  })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.get(user, id);
  }

  @Post()
  @RequirePermissions('suppliers.manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('suppliers.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('suppliers.manage')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliers.remove(user, id);
  }

  @Post(':id/payments')
  @RequirePermissions('suppliers.pay')
  @ApiOperation({
    summary: 'Record a payment from the office to this supplier',
  })
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SupplierPaymentDto,
  ) {
    return this.suppliers.pay(user, id, dto);
  }
}

@Module({ controllers: [SuppliersController], providers: [SuppliersService] })
export class SuppliersModule {}
