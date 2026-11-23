import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { LABELS } from '@travelos/shared';
import { IsIn, IsOptional } from 'class-validator';
import type { AuthUser } from '../common/auth.types';
import {
  CurrentUser,
  RequireAnyPermission,
  RequirePermissions,
} from '../common/decorators';
import {
  ExportService,
  ExportSpec,
  MONEY_FMT,
  num,
} from '../common/export/export.service';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { LifecycleService } from './lifecycle.service';
import { OffersService } from './offers.service';
import {
  ActiveDto,
  AttendanceDto,
  CancelProductDto,
  CloneTripDto,
  CreateOfferDto,
  CreateProgramDto,
  CreateTripDto,
  DecisionDto,
  GuidesDto,
  ImagesDto,
  LineDto,
  OfferQueryDto,
  PickupPointDto,
  ProgramQueryDto,
  PublicDto,
  TripQueryDto,
  UpdateLineDto,
  UpdateOfferDto,
  UpdateProgramDto,
  UpdateTripDto,
} from './products.dto';
import { ProgramsService } from './programs.service';
import { TripsService } from './trips.service';

type TripRow = Awaited<ReturnType<TripsService['list']>>['data'][number];
type ProgramRow = Awaited<ReturnType<ProgramsService['list']>>['data'][number];
type OfferRow = Awaited<ReturnType<OffersService['list']>>['data'][number];
type ManifestRow = Awaited<
  ReturnType<TripsService['passengers']>
>['passengers'][number] & { index: number };
const ar = <K extends keyof typeof LABELS>(
  k: K,
  v: string | null | undefined,
) => (v ? ((LABELS[k] as Record<string, { ar: string }>)[v]?.ar ?? v) : '');
const d = (v: Date | string | null | undefined) =>
  v ? new Date(v).toISOString().replace('T', ' ').slice(0, 16) : '';

const TRIPS_EXPORT: ExportSpec<TripRow> = {
  filename: 'trips',
  title: 'الرحلات',
  columns: [
    { header: 'الرمز', value: (t) => t.code, width: 14 },
    { header: 'الرحلة', value: (t) => t.title, width: 30 },
    { header: 'التصنيف', value: (t) => t.category?.nameAr },
    { header: 'النطاق', value: (t) => ar('travelScope', t.scope) },
    { header: 'من', value: (t) => t.originCity?.nameAr },
    { header: 'إلى', value: (t) => t.destinationCity?.nameAr },
    { header: 'الانطلاق', value: (t) => d(t.startsAt), width: 18 },
    { header: 'العودة', value: (t) => d(t.endsAt), width: 18 },
    {
      header: 'انتهاء التسجيل',
      value: (t) => d(t.registrationDeadline),
      width: 18,
    },
    { header: 'الفرع', value: (t) => t.branch?.name ?? 'كل الفروع' },
    { header: 'المقاعد المؤكدة', value: (t) => t.confirmedSeats },
    { header: 'السعة', value: (t) => t.maxPassengers },
    {
      header: 'السعر للشخص',
      value: (t) => num(t.pricePerPerson),
      numFmt: MONEY_FMT,
    },
    { header: 'العملة', value: (t) => t.currencyCode, width: 8 },
    { header: 'الحالة', value: (t) => ar('productStatus', t.status) },
  ],
};

const PROGRAMS_EXPORT: ExportSpec<ProgramRow> = {
  filename: 'programs',
  title: 'البرامج',
  columns: [
    { header: 'الرمز', value: (p) => p.code, width: 14 },
    { header: 'البرنامج', value: (p) => p.title, width: 30 },
    { header: 'التصنيف', value: (p) => p.category?.nameAr },
    { header: 'النطاق', value: (p) => ar('travelScope', p.scope) },
    {
      header: 'الرحلات',
      value: (p) => p.legs.map((l) => l.trip.code).join(' ← '),
      width: 30,
    },
    { header: 'البداية', value: (p) => d(p.startsAt), width: 18 },
    { header: 'النهاية', value: (p) => d(p.endsAt), width: 18 },
    {
      header: 'انتهاء التسجيل',
      value: (p) => d(p.registrationDeadline),
      width: 18,
    },
    { header: 'المقاعد المؤكدة', value: (p) => p.confirmedSeats },
    { header: 'المتاح', value: (p) => p.availableSeats },
    {
      header: 'السعر للشخص',
      value: (p) => num(p.pricePerPerson),
      numFmt: MONEY_FMT,
    },
    { header: 'العملة', value: (p) => p.currencyCode, width: 8 },
    { header: 'الحالة', value: (p) => ar('productStatus', p.status) },
  ],
};

const OFFERS_EXPORT: ExportSpec<OfferRow> = {
  filename: 'offers',
  title: 'العروض والخصومات',
  columns: [
    { header: 'العرض', value: (o) => o.title, width: 30 },
    { header: 'النوع', value: (o) => ar('offerKind', o.kind) },
    {
      header: 'الخصم',
      value: (o) =>
        `${o.discountValue.toString()}${o.discountMode === 'PERCENT' ? '%' : ''}`,
    },
    { header: 'من', value: (o) => d(o.validFrom).slice(0, 10) },
    { header: 'إلى', value: (o) => d(o.validTo).slice(0, 10) },
    {
      header: 'السعر للشخص',
      value: (o) => (o.kind === 'BUNDLE' ? num(o.pricePerPerson) : null),
      numFmt: MONEY_FMT,
    },
    {
      header: 'المقاعد',
      value: (o) => (o.maxSeats ? `${o.confirmedSeats}/${o.maxSeats}` : ''),
    },
    { header: 'ساري الآن', value: (o) => (o.live ? 'نعم' : 'لا') },
    { header: 'الحالة', value: (o) => (o.isActive ? 'فعّال' : 'معطّل') },
  ],
};

const MANIFEST: ExportSpec<ManifestRow> = {
  filename: 'passengers',
  title: 'كشف الركاب',
  columns: [
    { header: '#', value: (p) => p.index, width: 5 },
    { header: 'الاسم', value: (p) => p.customer.fullName, width: 26 },
    { header: 'الهاتف', value: (p) => p.customer.phone },
    { header: 'الجنسية', value: (p) => p.customer.nationality?.nameAr },
    {
      header: 'الوثيقة',
      value: (p) => ar('documentType', p.document?.docType),
    },
    { header: 'رقم الوثيقة', value: (p) => p.document?.docNumber },
    { header: 'رقم الحجز', value: (p) => p.booking.bookingNo },
    { header: 'عبر برنامج', value: (p) => p.booking.program?.code ?? '' },
    {
      header: 'نقطة الانطلاق',
      value: (p) => p.booking.pickupPoint?.city?.nameAr ?? '',
    },
    {
      header: 'التأشيرة',
      value: (p) => p.visas.map((v) => ar('visaStatus', v.status)).join('، '),
    },
    { header: 'الحضور', value: (p) => ar('attendance', p.attendance) },
    { header: 'ملاحظة', value: (p) => p.guideNote, width: 30 },
  ],
};

export class ManifestQueryDto {
  @ApiPropertyOptional({ enum: ['xlsx'] })
  @IsOptional()
  @IsIn(['xlsx'])
  export?: 'xlsx';
}

// ------------------------------------------------------------------ trips

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('trips.view')
  @ApiOperation({
    summary: 'Trips in the user’s scope (TRP-15). Supports export=xlsx|all.',
  })
  async list(@CurrentUser() user: AuthUser, @Query() q: TripQueryDto) {
    return this.exporter.respond(
      q,
      await this.trips.list(user, q),
      TRIPS_EXPORT,
      user,
    );
  }

  @Get(':id')
  @RequirePermissions('trips.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.get(user, id);
  }

  @Post()
  @RequirePermissions('trips.manage')
  @ApiOperation({ summary: 'Create a draft trip (TRP-01)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('trips.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(user, id, dto);
  }

  @Put(':id/images')
  @RequirePermissions('trips.manage')
  images(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImagesDto,
  ) {
    return this.trips.setImages(user, id, dto.images);
  }

  @Post(':id/lines')
  @RequirePermissions('trips.manage')
  @ApiOperation({
    summary:
      'Add a priced service; time/place continuity is enforced (TRP-04, TRP-05)',
  })
  addLine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LineDto,
  ) {
    return this.trips.addLine(user, id, dto);
  }

  @Patch(':id/lines/:lineId')
  @RequirePermissions('trips.manage')
  updateLine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateLineDto,
  ) {
    return this.trips.updateLine(user, id, lineId, dto);
  }

  @Delete(':id/lines/:lineId')
  @RequirePermissions('trips.manage')
  removeLine(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    return this.trips.removeLine(user, id, lineId);
  }

  @Post(':id/accept-costs')
  @HttpCode(200)
  @RequirePermissions('trips.manage', 'pricing.set_profit')
  @ApiOperation({
    summary: 'Accept the suppliers’ current costs and reprice (INT-07)',
  })
  acceptCosts(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trips.acceptCurrentCosts(user, id);
  }

  @Post(':id/pickup-points')
  @RequirePermissions('trips.manage')
  addPickup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PickupPointDto,
  ) {
    return this.trips.addPickupPoint(user, id, dto);
  }

  @Delete(':id/pickup-points/:pointId')
  @RequirePermissions('trips.manage')
  removePickup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pointId', ParseUUIDPipe) pointId: string,
  ) {
    return this.trips.removePickupPoint(user, id, pointId);
  }

  @Put(':id/guides')
  @RequirePermissions('trips.manage')
  setGuides(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuidesDto,
  ) {
    return this.trips.setGuides(user, id, dto.userIds);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequirePermissions('trips.manage')
  @ApiOperation({
    summary:
      'DRAFT → OPEN; needs ≥ 2 different services and a valid route (TRP-03)',
  })
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trips.publish(user, id);
  }

  @Patch(':id/public')
  @RequirePermissions('trips.manage')
  setPublic(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublicDto,
  ) {
    return this.trips.setPublic(user, id, dto.isPublic);
  }

  @Post(':id/close')
  @HttpCode(200)
  @RequirePermissions('trips.close')
  @ApiOperation({
    summary: 'Close registration now; records passengers and date (CLS-03)',
  })
  close(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trips.close(user, id);
  }

  @Post(':id/decision')
  @HttpCode(200)
  @RequirePermissions('trips.close')
  @ApiOperation({
    summary:
      'After closing: CONFIRM, EXTEND, REOPEN (Admin) or CANCEL (Admin) (CLS-05)',
  })
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
  ) {
    return this.trips.decide(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermissions('trips.cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelProductDto,
  ) {
    return this.trips.cancel(user, id, dto.reason);
  }

  @Post(':id/clone')
  @RequirePermissions('trips.manage')
  clone(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneTripDto,
  ) {
    return this.trips.clone(user, id, dto.startsAt);
  }

  @Get(':id/passengers')
  @RequirePermissions('trips.passengers')
  @ApiOperation({
    summary:
      'Confirmed passengers, direct and via programs (BKG-10). export=xlsx for the manifest (CLS-06).',
  })
  async passengers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: ManifestQueryDto,
  ) {
    const data = await this.trips.passengers(user, id);
    if (q.export !== 'xlsx') return data;
    const rows = data.passengers.map((p, i) => ({ ...p, index: i + 1 }));
    const buffer = await this.exporter.workbook(
      rows,
      { ...MANIFEST, title: `كشف ركاب ${data.trip.code}` },
      user,
    );
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="manifest-${data.trip.code}.xlsx"`,
    });
  }

  @Patch(':id/passengers/:passengerId')
  @RequirePermissions('trips.attendance')
  @ApiOperation({ summary: 'Attendance and guide note (DSH-04)' })
  attendance(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('passengerId', ParseUUIDPipe) passengerId: string,
    @Body() dto: AttendanceDto,
  ) {
    return this.trips.setAttendance(user, id, passengerId, dto);
  }
}

// ------------------------------------------------------------------ programs

@ApiTags('Programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramsController {
  constructor(
    private readonly programs: ProgramsService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('programs.view')
  async list(@CurrentUser() user: AuthUser, @Query() q: ProgramQueryDto) {
    return this.exporter.respond(
      q,
      await this.programs.list(user, q),
      PROGRAMS_EXPORT,
      user,
    );
  }

  @Get(':id')
  @RequirePermissions('programs.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.programs.get(user, id);
  }

  @Post()
  @RequirePermissions('programs.manage')
  @ApiOperation({
    summary: 'Chain ≥ 2 trips; place/time continuity enforced (PGM-01, PGM-02)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProgramDto) {
    return this.programs.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('programs.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programs.update(user, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequirePermissions('programs.manage')
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.programs.publish(user, id);
  }

  @Patch(':id/public')
  @RequirePermissions('programs.manage')
  setPublic(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublicDto,
  ) {
    return this.programs.setPublic(user, id, dto.isPublic);
  }

  @Post(':id/close')
  @HttpCode(200)
  @RequirePermissions('trips.close')
  close(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.programs.close(user, id);
  }

  @Post(':id/decision')
  @HttpCode(200)
  @RequirePermissions('trips.close')
  decide(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
  ) {
    return this.programs.decide(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermissions('trips.cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelProductDto,
  ) {
    return this.programs.cancel(user, id, dto.reason);
  }

  @Get(':id/passengers')
  @RequireAnyPermission('trips.passengers', 'bookings.view')
  passengers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.programs.passengers(user, id);
  }
}

// ------------------------------------------------------------------ offers

@ApiTags('Offers')
@ApiBearerAuth()
@Controller('offers')
export class OffersController {
  constructor(
    private readonly offers: OffersService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('offers.view')
  async list(@CurrentUser() user: AuthUser, @Query() q: OfferQueryDto) {
    return this.exporter.respond(
      q,
      await this.offers.list(user, q),
      OFFERS_EXPORT,
      user,
    );
  }

  @Get(':id')
  @RequirePermissions('offers.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.offers.get(user, id);
  }

  @Post()
  @RequirePermissions('offers.manage')
  @ApiOperation({
    summary: 'BUNDLE (≥ 2 services) or DISCOUNT (on trips/programs), OFR-01/02',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOfferDto) {
    return this.offers.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('offers.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offers.update(user, id, dto);
  }

  @Patch(':id/active')
  @RequirePermissions('offers.manage')
  setActive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.offers.setActive(user, id, dto.isActive);
  }
}

@Module({
  imports: [SuppliersModule],
  controllers: [TripsController, ProgramsController, OffersController],
  providers: [TripsService, ProgramsService, OffersService, LifecycleService],
  exports: [TripsService, ProgramsService, OffersService, LifecycleService],
})
export class ProductsModule {}
