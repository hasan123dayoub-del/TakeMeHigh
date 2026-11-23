import {
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
  ApiPropertyOptional,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { CITY_KINDS, type CityKind } from '@travelos/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuditService, diff } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import {
  ilike,
  orderArgs,
  pageArgs,
  paginate,
  PaginationQueryDto,
} from '../common/dto/pagination.dto';
import { ExportService, ExportSpec } from '../common/export/export.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

// ------------------------------------------------------------------ DTOs

export class CountryDto {
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  @Transform(({ value }: { value: string }) => value?.toUpperCase())
  isoCode!: string;
  @IsString() @MinLength(2) @MaxLength(80) nameAr!: string;
  @IsString() @MinLength(2) @MaxLength(80) nameEn!: string;
}
export class UpdateCountryDto extends PartialType(CountryDto) {}

export class CityDto {
  @IsUUID() countryId!: string;
  @IsString() @MinLength(2) @MaxLength(100) nameAr!: string;
  @IsString() @MinLength(2) @MaxLength(100) nameEn!: string;
  @IsIn(CITY_KINDS) kind!: CityKind;
}
export class UpdateCityDto extends PartialType(CityDto) {}

export class CategoryDto {
  @IsString() @MinLength(2) @MaxLength(80) nameAr!: string;
  @IsString() @MinLength(2) @MaxLength(80) nameEn!: string;
}
export class UpdateCategoryDto extends PartialType(CategoryDto) {}

export class ActiveDto {
  @IsBoolean() isActive!: boolean;
}

export class RefQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
}
export class CityQueryDto extends RefQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() countryId?: string;
  @ApiPropertyOptional({ enum: CITY_KINDS })
  @IsOptional()
  @IsIn(CITY_KINDS)
  kind?: CityKind;
}

// ------------------------------------------------------------------ export specs

const countryInclude = {
  _count: { select: { cities: true } },
} satisfies Prisma.CountryInclude;
type CountryRow = Prisma.CountryGetPayload<{ include: typeof countryInclude }>;
const COUNTRIES_EXPORT: ExportSpec<CountryRow> = {
  filename: 'countries',
  title: 'الدول',
  columns: [
    { header: 'الرمز', value: (c) => c.isoCode, width: 8 },
    { header: 'الاسم', value: (c) => c.nameAr, width: 24 },
    { header: 'Name', value: (c) => c.nameEn, width: 24 },
    { header: 'عدد المدن', value: (c) => c._count.cities },
    { header: 'الحالة', value: (c) => (c.isActive ? 'مفعّلة' : 'معطّلة') },
  ],
};
const cityInclude = {
  country: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      isoCode: true,
      isActive: true,
    },
  },
} satisfies Prisma.CityInclude;
type CityRow = Prisma.CityGetPayload<{ include: typeof cityInclude }>;
const KIND_AR: Record<CityKind, string> = {
  GOVERNORATE: 'محافظة',
  CITY: 'مدينة',
  TOURIST_SPOT: 'موقع سياحي',
};
const CITIES_EXPORT: ExportSpec<CityRow> = {
  filename: 'cities',
  title: 'المحافظات والمدن',
  columns: [
    { header: 'الاسم', value: (c) => c.nameAr, width: 24 },
    { header: 'Name', value: (c) => c.nameEn, width: 24 },
    { header: 'النوع', value: (c) => KIND_AR[c.kind] },
    { header: 'الدولة', value: (c) => c.country.nameAr },
    { header: 'الحالة', value: (c) => (c.isActive ? 'مفعّلة' : 'معطّلة') },
  ],
};
const categoryInclude = {
  _count: { select: { trips: true, programs: true } },
} satisfies Prisma.TripCategoryInclude;
type CategoryRow = Prisma.TripCategoryGetPayload<{
  include: typeof categoryInclude;
}>;
const CATEGORIES_EXPORT: ExportSpec<CategoryRow> = {
  filename: 'trip-categories',
  title: 'تصنيفات الرحلات',
  columns: [
    { header: 'التصنيف', value: (c) => c.nameAr, width: 24 },
    { header: 'Name', value: (c) => c.nameEn, width: 24 },
    { header: 'الرحلات', value: (c) => c._count.trips },
    { header: 'البرامج', value: (c) => c._count.programs },
    { header: 'الحالة', value: (c) => (c.isActive ? 'فعّال' : 'معطّل') },
  ],
};

// ------------------------------------------------------------------ service

@Injectable()
export class ReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // countries (REF-01: never deleted)
  async countries(q: RefQueryDto) {
    const where: Prisma.CountryWhereInput = {
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.search
        ? {
            OR: [
              { nameAr: ilike(q.search) },
              { nameEn: ilike(q.search) },
              { isoCode: ilike(q.search) },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.country.findMany({
        where,
        include: countryInclude,
        orderBy: orderArgs(
          q,
          ['nameAr', 'nameEn', 'isoCode'] as const,
          'nameAr',
        ),
        ...pageArgs(q),
      }),
      this.prisma.country.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async createCountry(user: AuthUser, dto: CountryDto) {
    const c = await this.prisma.country.create({
      data: dto,
      include: countryInclude,
    });
    await this.audit.log(user, {
      action: 'country.created',
      entityType: 'country',
      entityId: c.id,
      summary: `Country ${c.nameEn} added`,
    });
    return c;
  }

  async updateCountry(user: AuthUser, id: string, dto: UpdateCountryDto) {
    const before = await this.prisma.country.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Country not found');
    const c = await this.prisma.country.update({
      where: { id },
      data: dto,
      include: countryInclude,
    });
    await this.audit.log(user, {
      action: 'country.updated',
      entityType: 'country',
      entityId: id,
      summary: `Country ${c.nameEn} updated`,
      changes: diff(before as never, dto as never),
    });
    return c;
  }

  async setCountryActive(user: AuthUser, id: string, isActive: boolean) {
    const c = await this.prisma.country.update({
      where: { id },
      data: { isActive },
      include: countryInclude,
    });
    await this.audit.log(user, {
      action: isActive ? 'country.enabled' : 'country.disabled',
      entityType: 'country',
      entityId: id,
      summary: `Country ${c.nameEn} ${isActive ? 'enabled' : 'disabled'}`,
    });
    return c;
  }

  // cities (REF-02: never deleted)
  async cities(q: CityQueryDto) {
    const where: Prisma.CityWhereInput = {
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.countryId ? { countryId: q.countryId } : {}),
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.search
        ? { OR: [{ nameAr: ilike(q.search) }, { nameEn: ilike(q.search) }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.city.findMany({
        where,
        include: cityInclude,
        orderBy: orderArgs(q, ['nameAr', 'nameEn', 'kind'] as const, 'nameAr'),
        ...pageArgs(q),
      }),
      this.prisma.city.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async createCity(user: AuthUser, dto: CityDto) {
    await this.assertCountry(dto.countryId);
    const c = await this.prisma.city.create({
      data: dto,
      include: cityInclude,
    });
    await this.audit.log(user, {
      action: 'city.created',
      entityType: 'city',
      entityId: c.id,
      summary: `City ${c.nameEn} added`,
    });
    return c;
  }

  async updateCity(user: AuthUser, id: string, dto: UpdateCityDto) {
    const before = await this.prisma.city.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('City not found');
    if (dto.countryId) await this.assertCountry(dto.countryId);
    const c = await this.prisma.city.update({
      where: { id },
      data: dto,
      include: cityInclude,
    });
    await this.audit.log(user, {
      action: 'city.updated',
      entityType: 'city',
      entityId: id,
      summary: `City ${c.nameEn} updated`,
      changes: diff(before as never, dto as never),
    });
    return c;
  }

  async setCityActive(user: AuthUser, id: string, isActive: boolean) {
    const c = await this.prisma.city.update({
      where: { id },
      data: { isActive },
      include: cityInclude,
    });
    await this.audit.log(user, {
      action: isActive ? 'city.enabled' : 'city.disabled',
      entityType: 'city',
      entityId: id,
      summary: `City ${c.nameEn} ${isActive ? 'enabled' : 'disabled'}`,
    });
    return c;
  }

  // categories (REF-06: delete only when unused)
  async categories(q: RefQueryDto) {
    const where: Prisma.TripCategoryWhereInput = {
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.search
        ? { OR: [{ nameAr: ilike(q.search) }, { nameEn: ilike(q.search) }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tripCategory.findMany({
        where,
        include: categoryInclude,
        orderBy: orderArgs(
          q,
          ['nameAr', 'nameEn', 'createdAt'] as const,
          'createdAt',
        ),
        ...pageArgs(q),
      }),
      this.prisma.tripCategory.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async createCategory(user: AuthUser, dto: CategoryDto) {
    const c = await this.prisma.tripCategory.create({
      data: dto,
      include: categoryInclude,
    });
    await this.audit.log(user, {
      action: 'category.created',
      entityType: 'category',
      entityId: c.id,
      summary: `Category ${c.nameEn} added`,
    });
    return c;
  }

  async updateCategory(user: AuthUser, id: string, dto: UpdateCategoryDto) {
    const c = await this.prisma.tripCategory.update({
      where: { id },
      data: dto,
      include: categoryInclude,
    });
    await this.audit.log(user, {
      action: 'category.updated',
      entityType: 'category',
      entityId: id,
      summary: `Category ${c.nameEn} updated`,
      changes: { after: dto },
    });
    return c;
  }

  async setCategoryActive(user: AuthUser, id: string, isActive: boolean) {
    const c = await this.prisma.tripCategory.update({
      where: { id },
      data: { isActive },
      include: categoryInclude,
    });
    await this.audit.log(user, {
      action: isActive ? 'category.enabled' : 'category.disabled',
      entityType: 'category',
      entityId: id,
      summary: `Category ${c.nameEn} ${isActive ? 'enabled' : 'disabled'}`,
    });
    return c;
  }

  async deleteCategory(user: AuthUser, id: string) {
    const c = await this.prisma.tripCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { trips: true, programs: true, requests: true } },
      },
    });
    if (!c) throw new NotFoundException('Category not found');
    if (c._count.trips || c._count.programs || c._count.requests)
      throw new ConflictException(
        'This category is in use; deactivate it instead (BR-20)',
      );
    await this.prisma.tripCategory.delete({ where: { id } });
    await this.audit.log(user, {
      action: 'category.deleted',
      entityType: 'category',
      entityId: id,
      summary: `Category ${c.nameEn} deleted`,
    });
    return { deleted: true };
  }

  currencies() {
    return this.prisma.currency.findMany({ orderBy: { code: 'asc' } });
  }

  /**
   * Active options for every select in the app (REF-03: disabled items never appear in new choices;
   * REF-04: nor do the cities of a disabled country).
   */
  async lookups() {
    const [countries, cities, categories, currencies, services, branches] =
      await Promise.all([
        this.prisma.country.findMany({
          where: { isActive: true },
          select: { id: true, isoCode: true, nameAr: true, nameEn: true },
          orderBy: { nameAr: 'asc' },
        }),
        this.prisma.city.findMany({
          where: { isActive: true, country: { isActive: true } },
          select: {
            id: true,
            countryId: true,
            nameAr: true,
            nameEn: true,
            kind: true,
          },
          orderBy: { nameAr: 'asc' },
        }),
        this.prisma.tripCategory.findMany({
          where: { isActive: true },
          select: { id: true, nameAr: true, nameEn: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.currency.findMany({ orderBy: { code: 'asc' } }),
        this.prisma.service.findMany({
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            kind: true,
            nameAr: true,
            nameEn: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true, cityId: true },
          orderBy: { name: 'asc' },
        }),
      ]);
    return { countries, cities, categories, currencies, services, branches };
  }

  private async assertCountry(id: string) {
    if (
      !(await this.prisma.country.findFirst({ where: { id, isActive: true } }))
    )
      throw new NotFoundException('Country not found or disabled');
  }
}

// ------------------------------------------------------------------ controllers

@ApiTags('Reference data')
@ApiBearerAuth()
@Controller()
export class ReferenceController {
  constructor(
    private readonly ref: ReferenceService,
    private readonly exporter: ExportService,
  ) {}

  @Get('lookups')
  @ApiOperation({
    summary:
      'Active countries, cities, categories, currencies, services and branches for selects',
  })
  lookups() {
    return this.ref.lookups();
  }

  @Get('currencies')
  currencies() {
    return this.ref.currencies();
  }

  @Get('countries')
  @RequirePermissions('geo.view')
  async countries(@CurrentUser() user: AuthUser, @Query() q: RefQueryDto) {
    return this.exporter.respond(
      q,
      await this.ref.countries(q),
      COUNTRIES_EXPORT,
      user,
    );
  }

  @Post('countries')
  @RequirePermissions('geo.manage')
  createCountry(@CurrentUser() user: AuthUser, @Body() dto: CountryDto) {
    return this.ref.createCountry(user, dto);
  }

  @Patch('countries/:id')
  @RequirePermissions('geo.manage')
  updateCountry(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCountryDto,
  ) {
    return this.ref.updateCountry(user, id, dto);
  }

  @Patch('countries/:id/active')
  @RequirePermissions('geo.manage')
  @ApiOperation({
    summary: 'Enable / disable (countries are never deleted, BR-11)',
  })
  setCountryActive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.ref.setCountryActive(user, id, dto.isActive);
  }

  @Get('cities')
  @RequirePermissions('geo.view')
  async cities(@CurrentUser() user: AuthUser, @Query() q: CityQueryDto) {
    return this.exporter.respond(
      q,
      await this.ref.cities(q),
      CITIES_EXPORT,
      user,
    );
  }

  @Post('cities')
  @RequirePermissions('geo.manage')
  createCity(@CurrentUser() user: AuthUser, @Body() dto: CityDto) {
    return this.ref.createCity(user, dto);
  }

  @Patch('cities/:id')
  @RequirePermissions('geo.manage')
  updateCity(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCityDto,
  ) {
    return this.ref.updateCity(user, id, dto);
  }

  @Patch('cities/:id/active')
  @RequirePermissions('geo.manage')
  @ApiOperation({
    summary: 'Enable / disable (cities are never deleted, BR-11)',
  })
  setCityActive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.ref.setCityActive(user, id, dto.isActive);
  }

  @Get('categories')
  async categories(@CurrentUser() user: AuthUser, @Query() q: RefQueryDto) {
    return this.exporter.respond(
      q,
      await this.ref.categories(q),
      CATEGORIES_EXPORT,
      user,
    );
  }

  @Post('categories')
  @RequirePermissions('categories.manage')
  createCategory(@CurrentUser() user: AuthUser, @Body() dto: CategoryDto) {
    return this.ref.createCategory(user, dto);
  }

  @Patch('categories/:id')
  @RequirePermissions('categories.manage')
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.ref.updateCategory(user, id, dto);
  }

  @Patch('categories/:id/active')
  @RequirePermissions('categories.manage')
  setCategoryActive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActiveDto,
  ) {
    return this.ref.setCategoryActive(user, id, dto.isActive);
  }

  @Delete('categories/:id')
  @RequirePermissions('categories.manage')
  @ApiOperation({
    summary: 'Delete an unused category (otherwise deactivate, REF-06)',
  })
  deleteCategory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ref.deleteCategory(user, id);
  }
}

@Module({
  controllers: [ReferenceController],
  providers: [ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
