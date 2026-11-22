import {
  BadRequestException,
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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { officeUser } from '../common/scope';
import type { Tx } from '../prisma/prisma.service';
import { PrismaService } from '../prisma/prisma.service';

export class CreateEmployeeDto {
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsOptional() @Matches(/^[+\d][\d\s()-]{5,39}$/) phone?: string;
  /** At least 8 characters with a letter and a digit */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'password must contain a letter and a digit',
  })
  password!: string;
  /** Every employee belongs to exactly one branch */
  @IsUUID() branchId!: string;
  @IsUUID() roleId!: string;
  @IsOptional() @IsString() @MaxLength(80) jobTitle?: string;
  @IsOptional() @IsIn(['AR', 'EN']) locale?: 'AR' | 'EN';
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) fullName?: string;
  @IsOptional() @Matches(/^[+\d][\d\s()-]{5,39}$/) phone?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @IsString() @MaxLength(80) jobTitle?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class EmployeeQueryDto {
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

const view = {
  id: true,
  jobTitle: true,
  isActive: true,
  createdAt: true,
  branch: { select: { id: true, name: true } },
  role: { select: { id: true, name: true, scope: true } },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      lastLoginAt: true,
      locale: true,
    },
  },
} as const;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(user: AuthUser, q: EmployeeQueryDto) {
    const { officeId } = officeUser(user);
    return this.prisma.officeMember.findMany({
      where: {
        officeId,
        ...(q.branchId ? { branchId: q.branchId } : {}),
        ...(q.search
          ? {
              user: {
                OR: [
                  { fullName: { contains: q.search, mode: 'insensitive' } },
                  { email: { contains: q.search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      select: view,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async get(user: AuthUser, id: string) {
    const { officeId } = officeUser(user);
    const m = await this.prisma.officeMember.findFirst({
      where: { id, officeId },
      select: {
        ...view,
        supervisedTrips: {
          select: {
            trip: { select: { id: true, code: true, departureDate: true } },
          },
        },
      },
    });
    if (!m) throw new NotFoundException('Employee not found');
    return m;
  }

  async create(actor: AuthUser, dto: CreateEmployeeDto) {
    const { officeId } = officeUser(actor);
    await this.assertBranchAndRole(officeId, dto.branchId, dto.roleId);
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException('This email is already registered');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName: dto.fullName,
          phone: dto.phone,
          locale: dto.locale ?? 'AR',
          passwordHash: await bcrypt.hash(dto.password, 12),
        },
      });
      const member = await tx.officeMember.create({
        data: {
          userId: user.id,
          officeId,
          branchId: dto.branchId,
          roleId: dto.roleId,
          jobTitle: dto.jobTitle,
        },
        select: view,
      });
      await this.audit.log(
        actor,
        {
          action: 'employee.created',
          entityType: 'employee',
          entityId: member.id,
          summary: `Added employee ${dto.fullName}`,
        },
        tx,
      );
      return member;
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateEmployeeDto) {
    const a = officeUser(actor);
    const member = await this.prisma.officeMember.findFirst({
      where: { id, officeId: a.officeId },
      include: { role: true },
    });
    if (!member) throw new NotFoundException('Employee not found');
    if (
      id === a.memberId &&
      (dto.isActive === false || (dto.roleId && dto.roleId !== member.roleId))
    ) {
      throw new BadRequestException(
        'You cannot deactivate yourself or change your own role',
      );
    }
    await this.assertBranchAndRole(a.officeId, dto.branchId, dto.roleId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.officeMember.update({
        where: { id },
        data: {
          branchId: dto.branchId,
          roleId: dto.roleId,
          jobTitle: dto.jobTitle,
          isActive: dto.isActive,
        },
        select: view,
      });
      if (dto.fullName || dto.phone) {
        await tx.user.update({
          where: { id: member.userId },
          data: { fullName: dto.fullName, phone: dto.phone },
        });
      }
      await this.assertOfficeKeepsAnAdmin(tx, a.officeId);
      // Deactivation or a role change ends the employee's sessions immediately.
      if (dto.isActive === false || dto.roleId || dto.branchId) {
        await tx.refreshToken.updateMany({
          where: { userId: member.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.audit.log(
        actor,
        {
          action: 'employee.updated',
          entityType: 'employee',
          entityId: id,
          summary: `Updated employee ${updated.user.fullName}`,
          metadata: { ...dto },
        },
        tx,
      );
      return updated;
    });
  }

  private async assertBranchAndRole(
    officeId: string,
    branchId?: string,
    roleId?: string,
  ) {
    if (
      branchId &&
      !(await this.prisma.branch.findFirst({
        where: { id: branchId, officeId, isActive: true },
      }))
    ) {
      throw new BadRequestException('Branch not found or inactive');
    }
    if (
      roleId &&
      !(await this.prisma.role.findFirst({ where: { id: roleId, officeId } }))
    ) {
      throw new BadRequestException('Role not found');
    }
  }

  /** The office must always keep an active member who can manage employees and roles. */
  private async assertOfficeKeepsAnAdmin(tx: Tx, officeId: string) {
    const admins = await tx.officeMember.count({
      where: {
        officeId,
        isActive: true,
        role: {
          scope: 'OFFICE',
          permissions: { some: { permission: { key: 'employees.manage' } } },
        },
      },
    });
    if (admins < 1)
      throw new ConflictException(
        'The office must keep at least one active administrator',
      );
  }
}

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions('employees.manage')
  list(@CurrentUser() user: AuthUser, @Query() q: EmployeeQueryDto) {
    return this.employees.list(user, q);
  }

  @Get(':id')
  @RequirePermissions('employees.manage')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.employees.get(user, id);
  }

  @Post()
  @RequirePermissions('employees.manage')
  @ApiOperation({
    summary: 'Create an employee account in one branch with one role',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('employees.manage')
  @ApiOperation({
    summary:
      "Change branch, role, details or (de)activate. Ends the employee's sessions on access changes.",
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(user, id, dto);
  }
}

@Module({ controllers: [EmployeesController], providers: [EmployeesService] })
export class EmployeesModule {}
