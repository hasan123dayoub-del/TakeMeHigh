import { Body, ConflictException, Controller, Get, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { branchWhere, officeUser } from '../common/scope';
import { D, toMoney } from '../common/utils/money';
import type { Tx } from '../prisma/prisma.service';
import { PrismaService } from '../prisma/prisma.service';

export const PHONE = /^[+\d][\d\s()-]{5,39}$/;

export class CreateCustomerDto {
  @IsString() @MinLength(2) @MaxLength(160) fullName!: string;
  /** Unique per office: the same person is never entered twice */
  @Matches(PHONE, { message: 'phone must be a valid phone number' }) phone!: string;
  @IsOptional() @IsString() @MaxLength(40) nationalId?: string;
  @IsOptional() @IsString() @MaxLength(40) passportNumber?: string;
  @IsOptional() @IsDateString({ strict: true }) dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

/** Normalise phone numbers so "+963 944-123 456" and "+963944123456" are the same customer. */
export const normalizePhone = (p: string) => p.replace(/[\s()-]/g, '');

/**
 * Customers belong to the office (shared by its branches, so a returning customer is found at any
 * branch). Booking history and balances shown to a branch-scoped user only include their branch.
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, q: PaginationQueryDto) {
    const { officeId } = officeUser(user);
    const term = q.search?.trim();
    const where = {
      officeId,
      ...(term
        ? {
            OR: [
              { fullName: { contains: term, mode: 'insensitive' as const } },
              { phone: { contains: normalizePhone(term) } },
              { nationalId: { contains: term } },
              { passportNumber: { contains: term, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, orderBy: { createdAt: q.order === 'ASC' ? 'asc' : 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.customer.count({ where }),
    ]);
    const stats = rows.length
      ? await this.prisma.booking.groupBy({
          by: ['customerId', 'currencyCode'],
          where: { ...branchWhere(user), customerId: { in: rows.map((r) => r.id) }, status: { not: 'CANCELLED' } },
          _count: { _all: true },
          _sum: { totalAmount: true, paidAmount: true },
        })
      : [];
    return paginate(
      rows.map((c) => {
        const mine = stats.filter((s) => s.customerId === c.id);
        return {
          ...c,
          bookings: mine.reduce((n, s) => n + s._count._all, 0),
          // One balance per currency: SYP and USD are never added together.
          outstanding: mine.map((s) => ({ currencyCode: s.currencyCode, amount: toMoney(D(s._sum.totalAmount).sub(D(s._sum.paidAmount))) })),
        };
      }),
      total,
      q.page,
      q.pageSize,
    );
  }

  /** Profile + account statement (bookings, payments, refunds, balance per currency). */
  async get(user: AuthUser, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, officeId: officeUser(user).officeId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const bookings = await this.prisma.booking.findMany({
      where: { ...branchWhere(user), customerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        trip: { select: { id: true, code: true, departureDate: true, tripType: true, tour: { select: { name: true } } } },
        payments: { select: { id: true, amount: true, currencyCode: true, receiptNumber: true, paidAt: true, refundedAmount: true }, orderBy: { paidAt: 'asc' } },
        refunds: { select: { id: true, amount: true, currencyCode: true, reason: true, refundedAt: true }, orderBy: { refundedAt: 'asc' } },
        _count: { select: { passengers: true } },
      },
    });
    const balances = new Map<string, { total: ReturnType<typeof D>; paid: ReturnType<typeof D>; refunded: ReturnType<typeof D> }>();
    for (const b of bookings) {
      const acc = balances.get(b.currencyCode) ?? { total: D(0), paid: D(0), refunded: D(0) };
      if (b.status !== 'CANCELLED') acc.total = acc.total.add(D(b.totalAmount));
      acc.paid = acc.paid.add(D(b.paidAmount));
      acc.refunded = acc.refunded.add(D(b.refundedAmount));
      balances.set(b.currencyCode, acc);
    }
    return {
      ...customer,
      bookings,
      statement: [...balances.entries()].map(([currencyCode, v]) => ({
        currencyCode,
        totalBooked: toMoney(v.total),
        netPaid: toMoney(v.paid),
        refunded: toMoney(v.refunded),
        outstanding: toMoney(v.total.sub(v.paid)),
      })),
    };
  }

  async create(user: AuthUser, dto: CreateCustomerDto, tx?: Tx) {
    const { officeId } = officeUser(user);
    const db = tx ?? this.prisma;
    const phone = normalizePhone(dto.phone);
    const existing = await db.customer.findUnique({ where: { officeId_phone: { officeId, phone } } });
    if (existing) throw new ConflictException(`A customer with this phone already exists: ${existing.fullName}`);
    const customer = await db.customer.create({
      data: { ...dto, phone, officeId, dateOfBirth: dto.dateOfBirth ? new Date(`${dto.dateOfBirth}T00:00:00Z`) : undefined },
    });
    await this.audit.log(user, { action: 'customer.created', entityType: 'customer', entityId: customer.id, summary: `Added customer ${customer.fullName}` }, tx);
    return customer;
  }

  async update(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    const { officeId } = officeUser(user);
    const customer = await this.prisma.customer.findFirst({ where: { id, officeId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (dto.phone) {
      const other = await this.prisma.customer.findUnique({ where: { officeId_phone: { officeId, phone: normalizePhone(dto.phone) } } });
      if (other && other.id !== id) throw new ConflictException(`A customer with this phone already exists: ${other.fullName}`);
    }
    return this.prisma.customer.update({
      where: { id },
      data: { ...dto, phone: dto.phone ? normalizePhone(dto.phone) : undefined, dateOfBirth: dto.dateOfBirth ? new Date(`${dto.dateOfBirth}T00:00:00Z`) : undefined },
    });
  }
}

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions('customers.view')
  @ApiOperation({ summary: 'Search by name, phone, national ID or passport; with bookings and outstanding per currency' })
  list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    return this.customers.list(user, q);
  }

  @Get(':id')
  @RequirePermissions('customers.view')
  @ApiOperation({ summary: 'Customer profile and account statement' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.customers.get(user, id);
  }

  @Post()
  @RequirePermissions('customers.create')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('customers.edit')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(user, id, dto);
  }
}

@Module({ controllers: [CustomersController], providers: [CustomersService], exports: [CustomersService] })
export class CustomersModule {}
