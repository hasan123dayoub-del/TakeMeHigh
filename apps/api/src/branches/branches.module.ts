import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { officeUser } from '../common/scope';
import { PrismaService } from '../prisma/prisma.service';

export class CreateBranchDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @Matches(/^[+\d][\d\s()-]{5,39}$/) phone?: string;
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** OFFICE scope sees every branch; BRANCH scope only its own. */
  async list(user: AuthUser) {
    const u = officeUser(user);
    const branches = await this.prisma.branch.findMany({
      where:
        u.scope === 'OFFICE'
          ? { officeId: u.officeId }
          : { officeId: u.officeId, id: u.branchId },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { members: true, trips: true } } },
    });
    return branches.map(({ _count, ...b }) => ({
      ...b,
      employees: _count.members,
      trips: _count.trips,
    }));
  }

  async create(user: AuthUser, dto: CreateBranchDto) {
    const { officeId } = officeUser(user);
    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({ data: { ...dto, officeId } });
      await this.audit.log(
        user,
        {
          action: 'branch.created',
          entityType: 'branch',
          entityId: branch.id,
          summary: `Created branch ${branch.name}`,
        },
        tx,
      );
      return branch;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateBranchDto) {
    const { officeId } = officeUser(user);
    const branch = await this.prisma.branch.findFirst({
      where: { id, officeId },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    if (dto.isActive === false && branch.isActive) {
      if (branch.isMain)
        throw new ConflictException('The main branch cannot be deactivated');
      const activeMembers = await this.prisma.officeMember.count({
        where: { branchId: id, isActive: true },
      });
      if (activeMembers)
        throw new ConflictException(
          `Move or deactivate the ${activeMembers} employee(s) of this branch first`,
        );
      const openTrips = await this.prisma.trip.count({
        where: {
          branchId: id,
          status: { in: ['OPEN', 'REGISTRATION_CLOSED', 'APPROVED'] },
        },
      });
      if (openTrips)
        throw new ConflictException(
          `This branch still has ${openTrips} active trip(s)`,
        );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({ where: { id }, data: dto });
      await this.audit.log(
        user,
        {
          action: 'branch.updated',
          entityType: 'branch',
          entityId: id,
          summary: `Updated branch ${updated.name}`,
        },
        tx,
      );
      return updated;
    });
  }
}

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions()
  @ApiOperation({
    summary:
      'Branches visible to the user (all for Admin, own branch for Reception)',
  })
  list(@CurrentUser() user: AuthUser) {
    return this.branches.list(user);
  }

  @Post()
  @RequirePermissions('branches.manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBranchDto) {
    return this.branches.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('branches.manage')
  @ApiOperation({ summary: 'Update or (de)activate a branch' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(user, id, dto);
  }
}

@Module({ controllers: [BranchesController], providers: [BranchesService] })
export class BranchesModule {}
