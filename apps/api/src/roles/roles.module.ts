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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ALL_PERMISSIONS, PERMISSIONS } from '@travelos/shared';
import type { Permission } from '@travelos/shared';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { officeUser } from '../common/scope';
import { PrismaService } from '../prisma/prisma.service';

export class CreateRoleDto {
  @IsString() @MinLength(2) @MaxLength(60) name!: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  /** OFFICE = sees all branches; BRANCH = limited to the member's branch */
  @IsIn(['OFFICE', 'BRANCH']) scope!: 'OFFICE' | 'BRANCH';
  @IsArray() @ArrayUnique() @IsIn(ALL_PERMISSIONS, { each: true }) permissions!: Permission[];
}

export class UpdateRoleDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) name?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsIn(['OFFICE', 'BRANCH']) scope?: 'OFFICE' | 'BRANCH';
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(ALL_PERMISSIONS, { each: true }) permissions?: Permission[];
}

/** Permissions that only make sense office-wide; a BRANCH role cannot hold them. */
const OFFICE_ONLY: Permission[] = ['office.manage', 'branches.manage', 'employees.manage', 'roles.manage'];

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  catalogue() {
    return ALL_PERMISSIONS.map((key) => ({ key, ...PERMISSIONS[key] }));
  }

  async list(user: AuthUser) {
    const { officeId } = officeUser(user);
    const roles = await this.prisma.role.findMany({
      where: { officeId },
      include: { permissions: { include: { permission: true } }, _count: { select: { members: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return roles.map(({ permissions, _count, ...r }) => ({ ...r, members: _count.members, permissions: permissions.map((p) => p.permission.key) }));
  }

  async create(user: AuthUser, dto: CreateRoleDto) {
    const { officeId } = officeUser(user);
    this.assertScope(dto.scope, dto.permissions);
    const ids = await this.permissionIds(dto.permissions);
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: { officeId, name: dto.name, description: dto.description, scope: dto.scope, permissions: { create: ids.map((permissionId) => ({ permissionId })) } },
      });
      await this.audit.log(user, { action: 'role.created', entityType: 'role', entityId: role.id, summary: `Created role ${role.name}`, metadata: { permissions: dto.permissions } }, tx);
      return role;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateRoleDto) {
    const { officeId } = officeUser(user);
    const role = await this.prisma.role.findFirst({ where: { id, officeId }, include: { permissions: { include: { permission: true } } } });
    if (!role) throw new NotFoundException('Role not found');
    const scope = dto.scope ?? role.scope;
    const permissions = dto.permissions ?? (role.permissions.map((p) => p.permission.key) as Permission[]);
    this.assertScope(scope, permissions);
    const ids = dto.permissions ? await this.permissionIds(dto.permissions) : null;

    return this.prisma.$transaction(async (tx) => {
      await tx.role.update({ where: { id }, data: { name: dto.name, description: dto.description, scope } });
      if (ids) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({ data: ids.map((permissionId) => ({ roleId: id, permissionId })) });
      }
      // Never lock the office out of its own administration.
      const admins = await tx.officeMember.count({
        where: { officeId, isActive: true, role: { scope: 'OFFICE', permissions: { some: { permission: { key: 'roles.manage' } } } } },
      });
      if (admins < 1) throw new ConflictException('This change would leave no active member able to manage roles');
      // Holders of this role get the new permissions at their next token refresh (≤ 15 minutes).
      await this.audit.log(user, { action: 'role.updated', entityType: 'role', entityId: id, summary: `Updated role ${dto.name ?? role.name}`, metadata: { permissions } }, tx);
      return (await this.list(user)).find((r) => r.id === id);
    });
  }

  async remove(user: AuthUser, id: string) {
    const { officeId } = officeUser(user);
    const role = await this.prisma.role.findFirst({ where: { id, officeId }, include: { _count: { select: { members: true } } } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ConflictException('Default roles cannot be deleted');
    if (role._count.members) throw new ConflictException(`Reassign the ${role._count.members} employee(s) using this role first`);
    await this.prisma.role.delete({ where: { id } });
    await this.audit.log(user, { action: 'role.deleted', entityType: 'role', entityId: id, summary: `Deleted role ${role.name}` });
    return { deleted: true };
  }

  private assertScope(scope: string, permissions: Permission[]) {
    const bad = scope === 'BRANCH' ? permissions.filter((p) => OFFICE_ONLY.includes(p)) : [];
    if (bad.length) throw new BadRequestException(`A branch-level role cannot have: ${bad.join(', ')}`);
  }

  private async permissionIds(keys: Permission[]) {
    const rows = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    return rows.map((r) => r.id);
  }
}

@ApiTags('Roles & permissions')
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Catalogue of permission keys with Arabic and English descriptions' })
  catalogue() {
    return this.roles.catalogue();
  }

  @Get('roles')
  @RequirePermissions('employees.manage')
  list(@CurrentUser() user: AuthUser) {
    return this.roles.list(user);
  }

  @Post('roles')
  @RequirePermissions('roles.manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoleDto) {
    return this.roles.create(user, dto);
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.manage')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(user, id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.manage')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.roles.remove(user, id);
  }
}

@Module({ controllers: [RolesController], providers: [RolesService] })
export class RolesModule {}
