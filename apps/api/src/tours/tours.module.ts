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
import { ApiBearerAuth, ApiOperation, ApiTags, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { officeUser } from '../common/scope';
import { PrismaService } from '../prisma/prisma.service';

// ------------------------------------------------------------------ DTOs

export class CategoryDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(80) nameAr?: string;
}

export class TourDayDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(60) dayNumber!: number;
  @IsString() @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
}

export class TourImageDto {
  @IsUrl({ require_tld: false }) @MaxLength(500) url!: string;
  @IsOptional() @IsString() @MaxLength(160) caption?: string;
}

export class CreateTourDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsString() @MaxLength(120) destination!: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(60) days!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(60) nights!: number;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() @MaxLength(2000) accommodationInfo?: string;
  @IsOptional() @IsString() @MaxLength(2000) transportationInfo?: string;
  @IsOptional() @IsString() @MaxLength(5000) bookingTerms?: string;
  @IsOptional() @IsString() @MaxLength(5000) cancellationTerms?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverImageUrl?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => TourDayDto) itinerary?: TourDayDto[];
}

export class UpdateTourDto extends PartialType(CreateTourDto) {
  /** Inactive tours cannot be used for new trips (publishing control) */
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReplaceItineraryDto {
  @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => TourDayDto) days!: TourDayDto[];
}

export class ReplaceImagesDto {
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => TourImageDto) images!: TourImageDto[];
}

export class TourQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() categoryId?: string;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/(^-|-$)/g, '').slice(0, 160) || 'tour';

// ------------------------------------------------------------------ service

@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listCategories(user: AuthUser) {
    return this.prisma.tourCategory.findMany({
      where: { officeId: officeUser(user).officeId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { tours: true } } },
    });
  }

  createCategory(user: AuthUser, dto: CategoryDto) {
    return this.prisma.tourCategory.create({ data: { ...dto, officeId: officeUser(user).officeId } });
  }

  async updateCategory(user: AuthUser, id: string, dto: CategoryDto) {
    await this.ownedCategory(user, id);
    return this.prisma.tourCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(user: AuthUser, id: string) {
    await this.ownedCategory(user, id);
    // Tours keep existing and simply lose the category (ON DELETE SET NULL).
    await this.prisma.tourCategory.delete({ where: { id } });
    return { deleted: true };
  }

  async list(user: AuthUser, q: TourQueryDto) {
    const where = {
      officeId: officeUser(user).officeId,
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.search
        ? { OR: [{ name: { contains: q.search, mode: 'insensitive' as const } }, { destination: { contains: q.search, mode: 'insensitive' as const } }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tour.findMany({
        where,
        include: { category: true, _count: { select: { trips: true } } },
        orderBy: { createdAt: q.order === 'ASC' ? 'asc' : 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.tour.count({ where }),
    ]);
    return paginate(rows, total, q.page, q.pageSize);
  }

  async get(user: AuthUser, id: string) {
    const tour = await this.prisma.tour.findFirst({
      where: { id, officeId: officeUser(user).officeId },
      include: {
        category: true,
        itinerary: { orderBy: { dayNumber: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        trips: { select: { id: true, code: true, departureDate: true, status: true, tripType: true, branchId: true }, orderBy: { departureDate: 'desc' } },
      },
    });
    if (!tour) throw new NotFoundException('Tour not found');
    return tour;
  }

  async create(user: AuthUser, dto: CreateTourDto) {
    const { officeId } = officeUser(user);
    this.assertDuration(dto.days, dto.nights);
    if (dto.categoryId) await this.ownedCategory(user, dto.categoryId);
    this.assertItinerary(dto.itinerary, dto.days);
    const { itinerary, ...data } = dto;
    const slug = await this.uniqueSlug(officeId, dto.name);
    return this.prisma.$transaction(async (tx) => {
      const tour = await tx.tour.create({
        data: { ...data, officeId, slug, itinerary: itinerary ? { create: itinerary } : undefined },
        include: { itinerary: { orderBy: { dayNumber: 'asc' } }, category: true },
      });
      await this.audit.log(user, { action: 'tour.created', entityType: 'tour', entityId: tour.id, summary: `Created tour ${tour.name}` }, tx);
      return tour;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateTourDto) {
    const tour = await this.get(user, id);
    this.assertDuration(dto.days ?? tour.days, dto.nights ?? tour.nights);
    if (dto.categoryId) await this.ownedCategory(user, dto.categoryId);
    const { itinerary, ...data } = dto;
    if (itinerary) this.assertItinerary(itinerary, dto.days ?? tour.days);
    await this.prisma.$transaction(async (tx) => {
      await tx.tour.update({ where: { id }, data });
      if (itinerary) {
        await tx.tourDay.deleteMany({ where: { tourId: id } });
        await tx.tourDay.createMany({ data: itinerary.map((d) => ({ ...d, tourId: id })) });
      }
      await this.audit.log(user, { action: 'tour.updated', entityType: 'tour', entityId: id, summary: `Updated tour ${dto.name ?? tour.name}` }, tx);
    });
    return this.get(user, id);
  }

  async replaceItinerary(user: AuthUser, id: string, dto: ReplaceItineraryDto) {
    const tour = await this.get(user, id);
    this.assertItinerary(dto.days, tour.days);
    await this.prisma.$transaction([
      this.prisma.tourDay.deleteMany({ where: { tourId: id } }),
      this.prisma.tourDay.createMany({ data: dto.days.map((d) => ({ ...d, tourId: id })) }),
    ]);
    return this.get(user, id);
  }

  async replaceImages(user: AuthUser, id: string, dto: ReplaceImagesDto) {
    await this.get(user, id);
    await this.prisma.$transaction([
      this.prisma.tourImage.deleteMany({ where: { tourId: id } }),
      this.prisma.tourImage.createMany({ data: dto.images.map((img, i) => ({ ...img, tourId: id, sortOrder: i })) }),
    ]);
    return this.get(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const tour = await this.get(user, id);
    if (tour.trips.length) throw new ConflictException('This tour has trips. Deactivate it instead of deleting it.');
    await this.prisma.tour.delete({ where: { id } });
    await this.audit.log(user, { action: 'tour.deleted', entityType: 'tour', entityId: id, summary: `Deleted tour ${tour.name}` });
    return { deleted: true };
  }

  // ------------------------------------------------------------------ helpers

  private async ownedCategory(user: AuthUser, id: string) {
    const c = await this.prisma.tourCategory.findFirst({ where: { id, officeId: officeUser(user).officeId } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  private assertDuration(days: number, nights: number) {
    if (nights > days) throw new BadRequestException('Nights cannot exceed days');
  }

  private assertItinerary(days: TourDayDto[] | undefined, totalDays: number) {
    if (!days) return;
    const numbers = days.map((d) => d.dayNumber);
    if (new Set(numbers).size !== numbers.length) throw new BadRequestException('Each itinerary day number must be unique');
    if (numbers.some((n) => n > totalDays)) throw new BadRequestException(`Itinerary days must be between 1 and ${totalDays}`);
  }

  private async uniqueSlug(officeId: string, name: string) {
    const base = slugify(name);
    let slug = base;
    for (let i = 2; await this.prisma.tour.findUnique({ where: { officeId_slug: { officeId, slug } } }); i++) slug = `${base}-${i}`;
    return slug;
  }
}

// ------------------------------------------------------------------ controller

@ApiTags('Tours (programs)')
@ApiBearerAuth()
@Controller()
export class ToursController {
  constructor(private readonly tours: ToursService) {}

  @Get('tour-categories')
  @RequirePermissions('tours.view')
  listCategories(@CurrentUser() user: AuthUser) {
    return this.tours.listCategories(user);
  }

  @Post('tour-categories')
  @RequirePermissions('tours.manage')
  createCategory(@CurrentUser() user: AuthUser, @Body() dto: CategoryDto) {
    return this.tours.createCategory(user, dto);
  }

  @Patch('tour-categories/:id')
  @RequirePermissions('tours.manage')
  updateCategory(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CategoryDto) {
    return this.tours.updateCategory(user, id, dto);
  }

  @Delete('tour-categories/:id')
  @RequirePermissions('tours.manage')
  deleteCategory(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.deleteCategory(user, id);
  }

  @Get('tours')
  @RequirePermissions('tours.view')
  @ApiOperation({ summary: 'Reusable programs (filter by category, search name/destination)' })
  list(@CurrentUser() user: AuthUser, @Query() q: TourQueryDto) {
    return this.tours.list(user, q);
  }

  @Get('tours/:id')
  @RequirePermissions('tours.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.get(user, id);
  }

  @Post('tours')
  @RequirePermissions('tours.manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTourDto) {
    return this.tours.create(user, dto);
  }

  @Patch('tours/:id')
  @RequirePermissions('tours.manage')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTourDto) {
    return this.tours.update(user, id, dto);
  }

  @Put('tours/:id/itinerary')
  @RequirePermissions('tours.manage')
  replaceItinerary(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplaceItineraryDto) {
    return this.tours.replaceItinerary(user, id, dto);
  }

  @Put('tours/:id/images')
  @RequirePermissions('tours.manage')
  @ApiOperation({ summary: 'Replace the image gallery (URLs; uploads come later)' })
  replaceImages(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplaceImagesDto) {
    return this.tours.replaceImages(user, id, dto);
  }

  @Delete('tours/:id')
  @RequirePermissions('tours.manage')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tours.remove(user, id);
  }
}

@Module({ controllers: [ToursController], providers: [ToursService] })
export class ToursModule {}
