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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  type Permission,
} from '@travelos/shared';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import {
  CurrentUser,
  RequireAnyPermission,
  RequirePermissions,
} from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

export class CreateRoleDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{2,39}$/, {
    message: 'code must be UPPER_SNAKE_CASE (3-40 characters)',
  })
  code!: string;
  @IsString() @MinLength(2) @MaxLength(60) nameAr!: string;
  @IsString() @MinLength(2) @MaxLength(60) nameEn!: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  /** Custom roles are branch-bound (the Admin is the only ALL-scope role) */
  @IsIn(['BRANCH', 'ASSIGNED']) scope!: 'BRANCH' | 'ASSIGNED';
  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissions!: Permission[];
}

export class UpdateRoleDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) nameAr?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) nameEn?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
}

export class SetPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS, { each: true })
  permissions!: Permission[];
}

const include = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
} as const;

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const roles = await this.prisma.role.findMany({
      include,
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
    return roles.map((r) => this.shape(r));
  }

  catalogue() {
    return ALL_PERMISSIONS.map((code) => ({ code, ...PERMISSIONS[code] }));
  }

  async create(user: AuthUser, dto: CreateRoleDto) {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          code: dto.code,
          nameAr: dto.nameAr,
          nameEn: dto.nameEn,
          description: dto.description,
          scope: dto.scope,
          permissions: {
            create: await this.permissionLinks(tx, dto.permissions),
          },
        },
        include,
      });
      await this.audit.log(
        user,
        {
          action: 'role.created',
          entityType: 'role',
          entityId: role.id,
          summary: `Role ${role.nameEn} created`,
          changes: { after: { permissions: dto.permissions } },
        },
        tx,
      );
      return this.shape(role);
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateRoleDto) {
    await this.find(id);
    const role = await this.prisma.role.update({
      where: { id },
      data: dto,
      include,
    });
    await this.audit.log(user, {
      action: 'role.updated',
      entityType: 'role',
      entityId: id,
      summary: `Role ${role.nameEn} renamed`,
      changes: { after: dto },
    });
    return this.shape(role);
  }

  /** AUTH-06: any role's permission set except ADMIN's, which always has everything. */
  async setPermissions(user: AuthUser, id: string, permissions: Permission[]) {
    const role = await this.find(id);
    if (role.code === 'ADMIN')
      throw new BadRequestException(
        'The Admin role always has every permission',
      );
    const before = role.permissions.map((p) => p.permission.code);
    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({
        data: await this.permissionLinks(tx, permissions, id),
      });
      // Members get the new permissions at their next token refresh (≤ 15 minutes).
      const updated = await tx.role.findUniqueOrThrow({
        where: { id },
        include,
      });
      await this.audit.log(
        user,
        {
          action: 'role.permissions_changed',
          entityType: 'role',
          entityId: id,
          summary: `Permissions of ${role.nameEn} changed`,
          changes: {
            before: {
              added: [],
              removed: before.filter(
                (p) => !permissions.includes(p as Permission),
              ),
            },
            after: { added: permissions.filter((p) => !before.includes(p)) },
          },
        },
        tx,
      );
      return this.shape(updated);
    });
  }

  async remove(user: AuthUser, id: string) {
    const role = await this.find(id);
    if (role.isSystem)
      throw new BadRequestException('System roles cannot be deleted');
    if (role._count.users)
      throw new ConflictException(
        'Move the users of this role to another role first',
      );
    await this.prisma.role.delete({ where: { id } });
    await this.audit.log(user, {
      action: 'role.deleted',
      entityType: 'role',
      entityId: id,
      summary: `Role ${role.nameEn} deleted`,
    });
    return { deleted: true };
  }

  private async find(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, include });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private async permissionLinks(
    tx: Pick<PrismaService, 'permission'>,
    codes: Permission[],
    roleId?: string,
  ) {
    const rows = await tx.permission.findMany({
      where: { code: { in: codes } },
    });
    return rows.map((p) =>
      roleId ? { roleId, permissionId: p.id } : { permissionId: p.id },
    ) as { roleId: string; permissionId: string }[];
  }

  private shape(
    r: {
      permissions: { permission: { code: string } }[];
      _count: { users: number };
    } & Record<string, unknown>,
  ) {
    const { permissions, _count, ...rest } = r;
    return {
      ...rest,
      usersCount: _count.users,
      permissions: permissions.map((p) => p.permission.code),
    };
  }
}

@ApiTags('Roles & permissions')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequireAnyPermission('roles.manage', 'users.manage')
  @ApiOperation({
    summary: 'Roles with their permissions (needed to add staff)',
  })
  list() {
    return this.roles.list();
  }

  @Get('permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'The permission catalogue (module.action)' })
  catalogue() {
    return this.roles.catalogue();
  }

  @Post()
  @RequirePermissions('roles.manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoleDto) {
    return this.roles.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('roles.manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(user, id, dto);
  }

  @Put(':id/permissions')
  @RequirePermissions('roles.manage')
  @ApiOperation({
    summary: 'Replace the permission set of a role (not ADMIN, AUTH-06)',
  })
  setPermissions(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPermissionsDto,
  ) {
    return this.roles.setPermissions(user, id, dto.permissions);
  }

  @Delete(':id')
  @RequirePermissions('roles.manage')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roles.remove(user, id);
  }
}

@Module({ controllers: [RolesController], providers: [RolesService] })
export class RolesModule {}
