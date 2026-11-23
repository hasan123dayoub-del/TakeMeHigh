import { Controller, Get, Global, Module, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import {
  ilike,
  pageArgs,
  paginate,
  PaginationQueryDto,
} from '../common/dto/pagination.dto';
import { ExportService, ExportSpec } from '../common/export/export.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional({ description: 'e.g. booking, payment, trip' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() entityId?: string;
  @ApiPropertyOptional({
    description: 'Action prefix, e.g. auth. or payment.refunded',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}

const include = {
  user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.AuditLogInclude;
type Row = Prisma.AuditLogGetPayload<{ include: typeof include }>;

const EXPORT: ExportSpec<Row> = {
  filename: 'audit-log',
  title: 'سجل التدقيق',
  columns: [
    {
      header: 'الوقت',
      value: (r) => r.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      width: 20,
    },
    {
      header: 'المستخدم',
      value: (r) => r.user?.fullName ?? 'النظام',
      width: 22,
    },
    { header: 'العملية', value: (r) => r.action, width: 26 },
    { header: 'الكيان', value: (r) => r.entityType },
    { header: 'الوصف', value: (r) => r.summary, width: 50 },
    { header: 'IP', value: (r) => r.ip },
  ],
};

@ApiTags('Audit log')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exporter: ExportService,
  ) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOperation({
    summary:
      'Search the append-only audit trail (AUD-03). Supports export=xlsx|all.',
  })
  async list(@CurrentUser() user: AuthUser, @Query() q: AuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.action ? { action: { startsWith: q.action } } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: q.from } : {}),
              ...(q.to ? { lte: q.to } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { summary: ilike(q.search) },
              { action: ilike(q.search) },
              { user: { fullName: ilike(q.search) } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include,
        orderBy: { createdAt: q.order },
        ...pageArgs(q),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return this.exporter.respond(q, paginate(rows, total, q), EXPORT, user);
  }
}

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
