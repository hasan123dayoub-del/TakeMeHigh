import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { LABELS, REQUEST_STATUSES, type RequestStatus } from '@travelos/shared';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ilike, pageArgs, paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { ExportService, ExportSpec } from '../common/export/export.service';
import { isAll, ownBranch } from '../common/scope';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../products/trips.service';
import { ProductsModule } from '../products/products.module';

export class RequestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: REQUEST_STATUSES }) @IsOptional() @IsIn(REQUEST_STATUSES) status?: RequestStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional({ description: 'Admin: only requests without a branch' }) @IsOptional() @IsIn(['true']) unassigned?: 'true';
}

export class UpdateRequestDto {
  @IsOptional() @IsIn(['NEW', 'CONTACTED', 'REJECTED']) status?: 'NEW' | 'CONTACTED' | 'REJECTED';
  @IsOptional() @IsString() @MaxLength(1000) staffNotes?: string;
}

export class AssignRequestDto {
  @IsUUID() branchId!: string;
}

export class ConvertRequestDto {
  @IsUUID() bookingId!: string;
}

export class DraftTripDto {
  @IsUUID() categoryId!: string;
  @Type(() => Date) @IsDate() registrationDeadline!: Date;
}

const include = {
  originCity: { select: { id: true, nameAr: true, nameEn: true } },
  destinationCity: { select: { id: true, nameAr: true, nameEn: true } },
  category: { select: { id: true, nameAr: true } },
  assignedBranch: { select: { id: true, name: true } },
  handledBy: { select: { id: true, fullName: true } },
  convertedBooking: { select: { id: true, bookingNo: true } },
  items: {
    include: {
      service: { select: { id: true, kind: true, nameAr: true, nameEn: true } },
      company: { select: { id: true, name: true, transportMode: true } },
    },
  },
} satisfies Prisma.CustomTripRequestInclude;
type Row = Prisma.CustomTripRequestGetPayload<{ include: typeof include }>;

const EXPORT: ExportSpec<Row> = {
  filename: 'trip-requests',
  title: 'طلبات الرحلات المخصصة',
  columns: [
    { header: 'رقم الطلب', value: (r) => r.requestNo, width: 14 },
    { header: 'التاريخ', value: (r) => r.createdAt.toISOString().slice(0, 16).replace('T', ' '), width: 18 },
    { header: 'الاسم', value: (r) => r.contactName, width: 22 },
    { header: 'الهاتف', value: (r) => r.contactPhone },
    { header: 'من', value: (r) => r.originCity.nameAr },
    { header: 'إلى', value: (r) => r.destinationCity.nameAr },
    { header: 'الفترة', value: (r) => `${r.desiredFrom.toISOString().slice(0, 10)} → ${r.desiredTo.toISOString().slice(0, 10)}`, width: 24 },
    { header: 'الأشخاص', value: (r) => r.passengersCount },
    { header: 'الخدمات', value: (r) => r.items.map((i) => `${i.service.nameAr}: ${i.company?.name ?? `أخرى (${i.otherText})`}`).join(' | '), width: 50 },
    { header: 'الفرع', value: (r) => r.assignedBranch?.name ?? 'غير مسند' },
    { header: 'الحالة', value: (r) => LABELS.requestStatus[r.status].ar },
  ],
};

/** CTR-06..09: the office side of "design your trip". */
@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trips: TripsService,
  ) {}

  private scope(user: AuthUser): Prisma.CustomTripRequestWhereInput {
    return isAll(user) ? {} : { assignedBranchId: ownBranch(user) };
  }

  async list(user: AuthUser, q: RequestQueryDto) {
    const where: Prisma.CustomTripRequestWhereInput = {
      AND: [
        this.scope(user),
        q.status ? { status: q.status } : {},
        q.branchId && isAll(user) ? { assignedBranchId: q.branchId } : {},
        q.unassigned && isAll(user) ? { assignedBranchId: null } : {},
        q.search ? { OR: [{ requestNo: ilike(q.search) }, { contactName: ilike(q.search) }, { contactPhone: { contains: q.search } }] } : {},
      ],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customTripRequest.findMany({ where, include, orderBy: { createdAt: q.order }, ...pageArgs(q) }),
      this.prisma.customTripRequest.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async get(user: AuthUser, id: string) {
    const r = await this.prisma.customTripRequest.findFirst({ where: { AND: [{ id }, this.scope(user)] }, include });
    if (!r) throw new NotFoundException('Request not found');
    return r;
  }

  async update(user: AuthUser, id: string, dto: UpdateRequestDto) {
    const r = await this.get(user, id);
    if (r.status === 'CONVERTED') throw new ConflictException('This request is already converted');
    const updated = await this.prisma.customTripRequest.update({ where: { id }, data: { ...dto, handledById: user.userId }, include });
    await this.audit.log(user, { action: 'request.updated', entityType: 'request', entityId: id, summary: `${r.requestNo}: ${dto.status ?? 'notes updated'}` });
    return updated;
  }

  /** CTR-06: the Admin assigns a request to a branch. */
  async assign(user: AuthUser, id: string, branchId: string) {
    if (!isAll(user)) throw new ForbiddenException('Only the Admin assigns requests to branches');
    const r = await this.get(user, id);
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, isActive: true } });
    if (!branch) throw new NotFoundException('Branch not found');
    const updated = await this.prisma.customTripRequest.update({ where: { id }, data: { assignedBranchId: branchId }, include });
    await this.audit.log(user, { action: 'request.assigned', entityType: 'request', entityId: id, summary: `${r.requestNo} assigned to ${branch.name}` });
    return updated;
  }

  /** CTR-07: link the booking the request turned into. */
  async convert(user: AuthUser, id: string, bookingId: string) {
    const r = await this.get(user, id);
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || (!isAll(user) && booking.branchId !== user.branchId)) throw new NotFoundException('Booking not found');
    const updated = await this.prisma.customTripRequest.update({ where: { id }, data: { status: 'CONVERTED', convertedBookingId: bookingId, handledById: user.userId }, include });
    await this.audit.log(user, { action: 'request.converted', entityType: 'request', entityId: id, summary: `${r.requestNo} converted into booking ${booking.bookingNo}` });
    return updated;
  }

  /** CTR-08: a draft trip with the request's frame; chosen companies are listed for the builder. */
  async draftTrip(user: AuthUser, id: string, dto: DraftTripDto) {
    const r = await this.get(user, id);
    if (!user.permissions.includes('trips.manage')) throw new ForbiddenException('Creating trips needs trips.manage');
    const settings = await this.prisma.siteSetting.findUniqueOrThrow({ where: { id: 1 } });
    const startsAt = new Date(r.desiredFrom.getTime() + 8 * 3_600_000);
    const endsAt = new Date(r.desiredTo.getTime() + 20 * 3_600_000);
    if (dto.registrationDeadline > startsAt) throw new BadRequestException('The registration deadline must be before the desired departure');
    const services = r.items.map((i) => `- ${i.service.nameAr}: ${i.company?.name ?? `أخرى: ${i.otherText}`}${i.transportMode ? ` (${LABELS.transportMode[i.transportMode].ar})` : ''}`).join('\n');
    const trip = await this.trips.create(user, {
      title: `رحلة مخصصة — ${r.contactName}`,
      description: `مُنشأة من الطلب ${r.requestNo}.\nالخدمات المطلوبة:\n${services}${r.message ? `\nرسالة الزبون: ${r.message}` : ''}`,
      categoryId: dto.categoryId,
      branchId: isAll(user) ? (r.assignedBranchId ?? undefined) : undefined,
      originCityId: r.originCityId,
      destinationCityId: r.destinationCityId,
      startsAt,
      endsAt,
      registrationDeadline: dto.registrationDeadline,
      minPassengers: 1,
      maxPassengers: r.passengersCount,
      currencyCode: settings.defaultCurrencyCode,
      isPublic: false,
    });
    await this.prisma.customTripRequest.update({ where: { id }, data: { status: 'CONTACTED', handledById: user.userId, staffNotes: `${r.staffNotes ? `${r.staffNotes}\n` : ''}مسودة الرحلة ${trip.code}` } });
    return trip;
  }
}

@ApiTags('Custom trip requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('requests.view')
  @ApiOperation({ summary: 'Requests from the landing page (CTR-06). Supports export=xlsx|all.' })
  async list(@CurrentUser() user: AuthUser, @Query() q: RequestQueryDto) {
    return this.exporter.respond(q, await this.requests.list(user, q), EXPORT, user);
  }

  @Get(':id')
  @RequirePermissions('requests.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.get(user, id);
  }

  @Patch(':id')
  @RequirePermissions('requests.manage')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRequestDto) {
    return this.requests.update(user, id, dto);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @RequirePermissions('requests.manage')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRequestDto) {
    return this.requests.assign(user, id, dto.branchId);
  }

  @Post(':id/convert')
  @HttpCode(200)
  @RequirePermissions('requests.manage')
  convert(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ConvertRequestDto) {
    return this.requests.convert(user, id, dto.bookingId);
  }

  @Post(':id/draft-trip')
  @RequirePermissions('requests.manage', 'trips.manage')
  @ApiOperation({ summary: 'Create a draft trip pre-filled from the request (CTR-08)' })
  draftTrip(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DraftTripDto) {
    return this.requests.draftTrip(user, id, dto);
  }
}

@Module({ imports: [ProductsModule], controllers: [RequestsController], providers: [RequestsService] })
export class RequestsModule {}
