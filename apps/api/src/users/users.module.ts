import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
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
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { AuditService, diff } from '../audit-logs/audit.service';
import { PASSWORD_MESSAGE, PASSWORD_RULE } from '../auth/auth.dto';
import { BCRYPT_ROUNDS } from '../auth/auth.service';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ilike, orderArgs, pageArgs, paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { ExportService, ExportSpec } from '../common/export/export.service';
import { isAll, ownBranch } from '../common/scope';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';

const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

export class GuideProfileDto {
  @IsOptional() @IsString() @MaxLength(200) languages?: string;
  @IsOptional() @IsString() @MaxLength(60) licenseNo?: string;
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
}

export class CreateUserDto {
  @IsString() @MinLength(3) @MaxLength(120) fullName!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsUUID() roleId!: string;
  /** Required for every role except ALL-scope roles (Admin) */
  @IsOptional() @IsUUID() branchId?: string;
  /** Initial password; the user must change it at first sign-in (AUTH-10) */
  @IsString() @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE }) password!: string;
  @IsOptional() @ValidateNested() @Type(() => GuideProfileDto) guideProfile?: GuideProfileDto;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120) fullName?: string;
  @IsOptional() @IsEmail() @MaxLength(190) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @ValidateNested() @Type(() => GuideProfileDto) guideProfile?: GuideProfileDto;
}

export class TransferUserDto {
  @IsUUID() branchId!: string;
}
export class SetUserActiveDto {
  @IsBoolean() isActive!: boolean;
}

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() roleId?: string;
  @ApiPropertyOptional({ description: 'Role code, e.g. TOUR_GUIDE' }) @IsOptional() @IsString() @MaxLength(40) roleCode?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;
}

const select = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  mustChangePassword: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, code: true, nameAr: true, nameEn: true, scope: true } },
  branch: { select: { id: true, name: true } },
  guideProfile: true,
} satisfies Prisma.UserSelect;
type UserRow = Prisma.UserGetPayload<{ select: typeof select }>;

const EXPORT: ExportSpec<UserRow> = {
  filename: 'employees',
  title: 'الموظفون',
  columns: [
    { header: 'الاسم', value: (u) => u.fullName, width: 26 },
    { header: 'البريد', value: (u) => u.email, width: 30 },
    { header: 'الهاتف', value: (u) => u.phone },
    { header: 'الدور', value: (u) => u.role.nameAr },
    { header: 'الفرع', value: (u) => u.branch?.name ?? 'كل الفروع' },
    { header: 'آخر دخول', value: (u) => u.lastLoginAt },
    { header: 'الحالة', value: (u) => (u.isActive ? 'فعّال' : 'معطّل') },
  ],
};

/** Roles a branch manager may hand out (ORG-05). */
const BRANCH_MANAGER_GRANTABLE = ['EMPLOYEE', 'TOUR_GUIDE'];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private scopeWhere(user: AuthUser): Prisma.UserWhereInput {
    // A branch manager sees the staff of their branch; never the Admin.
    return isAll(user) ? {} : { branchId: ownBranch(user) };
  }

  async list(user: AuthUser, q: UserQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...this.scopeWhere(user),
      ...(q.branchId && isAll(user) ? { branchId: q.branchId } : {}),
      ...(q.roleId ? { roleId: q.roleId } : {}),
      ...(q.roleCode ? { role: { code: q.roleCode } } : {}),
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.search ? { OR: [{ fullName: ilike(q.search) }, { email: ilike(q.search) }, { phone: { contains: q.search } }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select, orderBy: orderArgs(q, ['fullName', 'createdAt', 'lastLoginAt'] as const, 'createdAt'), ...pageArgs(q) }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async get(user: AuthUser, id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, ...this.scopeWhere(user) }, select });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async create(user: AuthUser, dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');
    const branchId = await this.resolveBranch(user, role, dto.branchId);
    this.assertCanGrant(user, role.code);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone,
          roleId: role.id,
          branchId,
          passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
          mustChangePassword: true,
          guideProfile: role.code === 'TOUR_GUIDE' && dto.guideProfile ? { create: dto.guideProfile } : undefined,
        },
        select,
      });
      await this.audit.log(user, { action: 'user.created', entityType: 'user', entityId: created.id, summary: `${created.fullName} added as ${role.nameEn}`, changes: { after: { email: created.email, role: role.code, branchId } } }, tx);
      return created;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateUserDto) {
    const before = await this.get(user, id);
    this.assertCanManage(user, before.role.code);
    let roleChange: { code: string; scope: string; id: string } | null = null;
    if (dto.roleId && dto.roleId !== before.role.id) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new NotFoundException('Role not found');
      this.assertCanGrant(user, role.code);
      if ((role.scope === 'ALL') !== (before.role.scope === 'ALL'))
        throw new BadRequestException('Moving between the Admin role and a branch role is not allowed; create a new account instead');
      if (before.role.code === 'ADMIN') await this.assertNotLastAdmin(id);
      roleChange = role;
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          fullName: dto.fullName?.trim(),
          email: dto.email?.trim().toLowerCase(),
          phone: dto.phone,
          roleId: roleChange?.id,
          guideProfile: dto.guideProfile ? { upsert: { create: dto.guideProfile, update: dto.guideProfile } } : undefined,
        },
        select,
      });
      if (roleChange) await this.revokeSessions(tx, id);
      await this.audit.log(user, { action: 'user.updated', entityType: 'user', entityId: id, summary: `User ${updated.fullName} updated`, changes: diff({ ...before, roleId: before.role.id } as never, dto as never) }, tx);
      return updated;
    });
  }

  /** ORG-06: only the Admin moves a user to another branch. */
  async transfer(user: AuthUser, id: string, branchId: string) {
    const before = await this.get(user, id);
    if (before.role.scope === 'ALL') throw new BadRequestException('The Admin is not linked to a branch');
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, isActive: true } });
    if (!branch) throw new NotFoundException('Branch not found or deactivated');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { branchId }, select });
      await this.revokeSessions(tx, id);
      await this.audit.log(user, { action: 'user.transferred', entityType: 'user', entityId: id, summary: `${before.fullName} moved from ${before.branch?.name} to ${branch.name}`, changes: { before: { branchId: before.branch?.id }, after: { branchId } } }, tx);
      return updated;
    });
  }

  /** ORG-08 / AUTH-11 */
  async setActive(user: AuthUser, id: string, isActive: boolean) {
    const before = await this.get(user, id);
    this.assertCanManage(user, before.role.code);
    if (id === user.userId && !isActive) throw new BadRequestException('You cannot deactivate your own account');
    if (!isActive && before.role.code === 'ADMIN') await this.assertNotLastAdmin(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { isActive, failedLoginCount: 0, lockedUntil: null }, select });
      if (!isActive) await this.revokeSessions(tx, id);
      await this.audit.log(user, { action: isActive ? 'user.activated' : 'user.deactivated', entityType: 'user', entityId: id, summary: `${before.fullName} ${isActive ? 'activated' : 'deactivated'}` }, tx);
      return updated;
    });
  }

  /** AUTH-13: a temporary password the user must change at next sign-in. Also unlocks the account. */
  async resetPassword(user: AuthUser, id: string) {
    const target = await this.get(user, id);
    this.assertCanManage(user, target.role.code);
    const temporary = temporaryPassword();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(temporary, BCRYPT_ROUNDS), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null } });
      await this.revokeSessions(tx, id);
      await this.audit.log(user, { action: 'user.password_reset', entityType: 'user', entityId: id, summary: `Password of ${target.fullName} reset` }, tx);
    });
    return { temporaryPassword: temporary };
  }

  // ------------------------------------------------------------------ rules

  /** ORG-03, ORG-04: ALL-scope roles have no branch; every other role needs an active branch. */
  private async resolveBranch(user: AuthUser, role: { scope: string }, requested?: string) {
    if (role.scope === 'ALL') {
      if (requested) throw new BadRequestException('The Admin role is not linked to a branch');
      return null;
    }
    const branchId = isAll(user) ? requested : ownBranch(user);
    if (!branchId) {
      const any = await this.prisma.branch.count({ where: { isActive: true } });
      throw new BadRequestException(any ? 'Choose a branch for this user' : 'Add a branch first: every employee must belong to a branch (BR-03)');
    }
    if (!isAll(user) && requested && requested !== branchId) throw new ForbiddenException('You can only add staff to your own branch');
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, isActive: true } });
    if (!branch) throw new NotFoundException('Branch not found or deactivated');
    return branchId;
  }

  private assertCanGrant(user: AuthUser, roleCode: string) {
    if (isAll(user)) return;
    if (!BRANCH_MANAGER_GRANTABLE.includes(roleCode)) throw new ForbiddenException('A branch manager can only add employees and tour guides');
  }

  private assertCanManage(user: AuthUser, targetRoleCode: string) {
    if (isAll(user)) return;
    if (!BRANCH_MANAGER_GRANTABLE.includes(targetRoleCode)) throw new ForbiddenException('A branch manager can only manage employees and tour guides of the branch');
  }

  private async assertNotLastAdmin(exceptId: string) {
    const others = await this.prisma.user.count({ where: { role: { code: 'ADMIN' }, isActive: true, id: { not: exceptId } } });
    if (others === 0) throw new ConflictException('This is the last active Admin and cannot be deactivated or changed');
  }

  private revokeSessions(tx: Tx, userId: string) {
    return tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}

/** 12 readable characters with at least one letter and digit. */
function temporaryPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const chars = [letters[randomInt(letters.length)], digits[randomInt(digits.length)]];
  while (chars.length < 12) chars.push(all[randomInt(all.length)]);
  return chars.sort(() => randomInt(3) - 1).join('');
}

@ApiTags('Users (employees, managers, guides)')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Staff (Admin: all; branch manager: own branch). Supports export=xlsx|all.' })
  async list(@CurrentUser() user: AuthUser, @Query() q: UserQueryDto) {
    return this.exporter.respond(q, await this.users.list(user, q), EXPORT, user);
  }

  @Get(':id')
  @RequirePermissions('users.view')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(user, id);
  }

  @Post()
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Add a staff member (ORG-04). Requires an active branch except for Admins (BR-03).' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user, id, dto);
  }

  @Patch(':id/branch')
  @RequirePermissions('users.manage', 'branches.manage')
  @ApiOperation({ summary: 'Move a user to another branch (Admin only, ORG-06)' })
  transfer(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferUserDto) {
    return this.users.transfer(user, id, dto.branchId);
  }

  @Patch(':id/active')
  @RequirePermissions('users.manage')
  setActive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetUserActiveDto) {
    return this.users.setActive(user, id, dto.isActive);
  }

  @Post(':id/reset-password')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Issue a temporary password (must be changed at next sign-in, AUTH-13)' })
  resetPassword(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.resetPassword(user, id);
  }
}

@Module({ controllers: [UsersController], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
