import {
  Body,
  Controller,
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
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
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
import { isAll } from '../common/scope';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class BranchDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsUUID() cityId!: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(40) whatsapp?: string;
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number;
  @IsOptional() @IsString() @MaxLength(120) workingHours?: string;
  @IsOptional() @IsBoolean() showOnLanding?: boolean;
}
export class UpdateBranchDto extends PartialType(BranchDto) {}
export class SetActiveDto {
  @IsBoolean() isActive!: boolean;
}

export class BranchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cityId?: string;
}

const include = {
  city: { include: { country: true } },
  _count: { select: { users: true } },
} satisfies Prisma.BranchInclude;
type BranchRow = Prisma.BranchGetPayload<{ include: typeof include }>;

const EXPORT: ExportSpec<BranchRow> = {
  filename: 'branches',
  title: 'الفروع',
  columns: [
    { header: 'الفرع', value: (b) => b.name, width: 24 },
    { header: 'المدينة', value: (b) => b.city.nameAr },
    { header: 'العنوان', value: (b) => b.address, width: 30 },
    { header: 'الهاتف', value: (b) => b.phone },
    { header: 'واتساب', value: (b) => b.whatsapp },
    { header: 'ساعات العمل', value: (b) => b.workingHours },
    { header: 'عدد الموظفين', value: (b) => b._count.users },
    {
      header: 'يظهر في الصفحة العامة',
      value: (b) => (b.showOnLanding ? 'نعم' : 'لا'),
    },
    { header: 'الحالة', value: (b) => (b.isActive ? 'فعّال' : 'معطّل') },
  ],
};

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, q: BranchQueryDto) {
    const where: Prisma.BranchWhereInput = {
      ...(isAll(user) ? {} : { id: user.branchId ?? '' }),
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.cityId ? { cityId: q.cityId } : {}),
      ...(q.search
        ? {
            OR: [
              { name: ilike(q.search) },
              { address: ilike(q.search) },
              { phone: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where,
        include,
        orderBy: orderArgs(q, ['name', 'createdAt'] as const, 'name'),
        ...pageArgs(q),
      }),
      this.prisma.branch.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async get(user: AuthUser, id: string) {
    const b = await this.prisma.branch.findUnique({ where: { id }, include });
    if (!b || (!isAll(user) && b.id !== user.branchId))
      throw new NotFoundException('Branch not found');
    return b;
  }

  async create(user: AuthUser, dto: BranchDto) {
    await this.assertCity(dto.cityId);
    return this.prisma.$transaction(async (tx) => {
      const b = await tx.branch.create({ data: dto, include });
      await this.audit.log(
        user,
        {
          action: 'branch.created',
          entityType: 'branch',
          entityId: b.id,
          summary: `Branch "${b.name}" created`,
          changes: { after: dto },
        },
        tx,
      );
      return b;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateBranchDto) {
    const before = await this.get(user, id);
    if (dto.cityId) await this.assertCity(dto.cityId);
    return this.prisma.$transaction(async (tx) => {
      const b = await tx.branch.update({ where: { id }, data: dto, include });
      await this.audit.log(
        user,
        {
          action: 'branch.updated',
          entityType: 'branch',
          entityId: id,
          summary: `Branch "${b.name}" updated`,
          changes: diff(before as never, dto as never),
        },
        tx,
      );
      return b;
    });
  }

  /** ORG-02: branches are never deleted; deactivation keeps history and blocks sign-in of its staff. */
  async setActive(user: AuthUser, id: string, isActive: boolean) {
    const before = await this.get(user, id);
    return this.prisma.$transaction(async (tx) => {
      const b = await tx.branch.update({
        where: { id },
        data: { isActive },
        include,
      });
      if (!isActive)
        await tx.refreshToken.updateMany({
          where: { user: { branchId: id }, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      await this.audit.log(
        user,
        {
          action: isActive ? 'branch.activated' : 'branch.deactivated',
          entityType: 'branch',
          entityId: id,
          summary: `Branch "${before.name}" ${isActive ? 'activated' : 'deactivated'}`,
        },
        tx,
      );
      return b;
    });
  }

  private async assertCity(cityId: string) {
    const city = await this.prisma.city.findFirst({
      where: { id: cityId, isActive: true, country: { isActive: true } },
    });
    if (!city) throw new NotFoundException('City not found or disabled');
  }
}

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branches: BranchesService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('branches.view')
  @ApiOperation({
    summary:
      'Branches (Admin: all; others: their own). Supports export=xlsx|all.',
  })
  async list(@CurrentUser() user: AuthUser, @Query() q: BranchQueryDto) {
    return this.exporter.respond(
      q,
      await this.branches.list(user, q),
      EXPORT,
      user,
    );
  }

  @Get(':id')
  @RequirePermissions('branches.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.branches.get(user, id);
  }

  @Post()
  @RequirePermissions('branches.manage')
  @ApiOperation({ summary: 'Create a branch (ORG-01)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: BranchDto) {
    return this.branches.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('branches.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(user, id, dto);
  }

  @Patch(':id/active')
  @RequirePermissions('branches.manage')
  @ApiOperation({ summary: 'Activate or deactivate (no deletion, ORG-02)' })
  setActive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.branches.setActive(user, id, dto.isActive);
  }
}

@Module({
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
