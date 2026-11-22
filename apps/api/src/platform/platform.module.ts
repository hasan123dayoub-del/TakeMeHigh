import { Body, ConflictException, Controller, Get, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DEFAULT_ROLES } from '@travelos/shared';
import * as bcrypt from 'bcrypt';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, PlatformAdminOnly } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

export class CreateOfficeDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  /** Public URL: /{slug} */
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug may contain lowercase letters, digits and dashes' }) @MaxLength(80) slug!: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsString() @MinLength(2) @MaxLength(120) mainBranchName!: string;
  // first administrator
  @IsString() @MinLength(2) @MaxLength(120) adminFullName!: string;
  @IsEmail() adminEmail!: string;
  @IsString() @MinLength(8) @MaxLength(128) @Matches(/(?=.*[A-Za-z])(?=.*\d)/) adminPassword!: string;
}

export class SetOfficeStatusDto {
  @IsBoolean() isActive!: boolean;
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listOffices() {
    const offices = await this.prisma.office.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, slug: true, city: true, isActive: true, publicPageEnabled: true, createdAt: true,
        _count: { select: { branches: true, members: true, trips: true, bookings: true } },
      },
    });
    return offices.map(({ _count, ...o }) => ({ ...o, ..._count }));
  }

  /** Onboards a tourism office: main branch, default Admin/Reception roles, first admin account. */
  async createOffice(actor: AuthUser, dto: CreateOfficeDto) {
    const email = dto.adminEmail.trim().toLowerCase();
    if (await this.prisma.office.findUnique({ where: { slug: dto.slug } })) throw new ConflictException('This slug is taken');
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('This email is already registered');
    const permissions = new Map((await this.prisma.permission.findMany()).map((p) => [p.key, p.id]));
    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      const office = await tx.office.create({
        data: { name: dto.name, slug: dto.slug, city: dto.city, currencies: { create: [{ currencyCode: 'SYP' }, { currencyCode: 'USD' }] } },
      });
      const branch = await tx.branch.create({ data: { officeId: office.id, name: dto.mainBranchName, city: dto.city, isMain: true } });
      let adminRoleId = '';
      for (const r of DEFAULT_ROLES) {
        const role = await tx.role.create({
          data: {
            officeId: office.id, name: r.name, description: r.description, scope: r.scope, isSystem: true,
            permissions: { create: r.permissions.map((key) => ({ permissionId: permissions.get(key)! })) },
          },
        });
        if (r.key === 'ADMIN') adminRoleId = role.id;
      }
      const user = await tx.user.create({ data: { email, fullName: dto.adminFullName, passwordHash } });
      await tx.officeMember.create({ data: { userId: user.id, officeId: office.id, branchId: branch.id, roleId: adminRoleId, jobTitle: 'Office admin' } });
      await this.audit.log(actor, { officeId: office.id, action: 'office.created', entityType: 'office', entityId: office.id, summary: `Onboarded office ${office.name}` }, tx);
      return { ...office, mainBranch: branch, admin: { id: user.id, email } };
    });
  }

  async setStatus(actor: AuthUser, id: string, dto: SetOfficeStatusDto) {
    const office = await this.prisma.office.findUnique({ where: { id } });
    if (!office) throw new NotFoundException('Office not found');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.office.update({ where: { id }, data: { isActive: dto.isActive } });
      if (!dto.isActive) {
        // Deactivated offices lose their sessions immediately.
        await tx.refreshToken.updateMany({ where: { revokedAt: null, user: { membership: { officeId: id } } }, data: { revokedAt: new Date() } });
      }
      await this.audit.log(actor, { officeId: id, action: dto.isActive ? 'office.activated' : 'office.deactivated', entityType: 'office', entityId: id, summary: `${dto.isActive ? 'Activated' : 'Deactivated'} office ${office.name}` }, tx);
      return updated;
    });
  }
}

@ApiTags('Platform (Safarni staff)')
@ApiBearerAuth()
@PlatformAdminOnly()
@Controller('platform/offices')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @ApiOperation({ summary: 'All tourism offices on the platform with usage counts' })
  list() {
    return this.platform.listOffices();
  }

  @Post()
  @ApiOperation({ summary: 'Onboard a new office (main branch, default roles, first admin)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOfficeDto) {
    return this.platform.createOffice(user, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate an office' })
  setStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetOfficeStatusDto) {
    return this.platform.setStatus(user, id, dto);
  }
}

@Module({ controllers: [PlatformController], providers: [PlatformService] })
export class PlatformModule {}
