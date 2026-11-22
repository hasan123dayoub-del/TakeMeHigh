import { BadRequestException, Controller, Get, Module, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import type { Response } from 'express';
import type { AuthUser } from '../common/auth.types';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { officeUser } from '../common/scope';
import { PrismaService } from '../prisma/prisma.service';
import { TripsModule } from '../trips/trips.controller';
import { DashboardService } from './dashboard.service';
import { REPORT_TYPES, ReportsService, ReportType } from './reports.service';

class ReportQueryDto {
  @IsOptional() @IsDateString({ strict: true }) from?: string;
  @IsOptional() @IsDateString({ strict: true }) to?: string;
  @IsOptional() @IsUUID() tripId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsString() status?: string;
  /** json (default) or xlsx. PDF is produced by the web app's print view (proper Arabic shaping/RTL). */
  @IsOptional() @IsIn(['json', 'xlsx']) format?: 'json' | 'xlsx';
  @IsOptional() @IsIn(['ar', 'en']) lang?: 'ar' | 'en';
}

@ApiTags('Dashboard & reports')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly reports: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('trips.view')
  @ApiOperation({ summary: 'KPIs, upcoming trips, recent bookings, tasks; money per currency for financial roles' })
  get(@CurrentUser() user: AuthUser) {
    return this.dashboard.get(user);
  }

  @Get('reports/:type')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary:
      'bookings | upcoming-trips | passengers (tripId) | customer-statement (customerId) | payments* | refunds* | trip-profit* ' +
      '(*needs reports.financial). format=xlsx downloads Excel.',
  })
  async report(@CurrentUser() user: AuthUser, @Param('type') type: string, @Query() q: ReportQueryDto, @Res({ passthrough: true }) res: Response) {
    if (!REPORT_TYPES.includes(type as ReportType)) throw new BadRequestException(`Unknown report. Use one of: ${REPORT_TYPES.join(', ')}`);
    const report = await this.reports.build(user, type as ReportType, q);
    if (q.format !== 'xlsx') return report;

    const office = await this.prisma.office.findUniqueOrThrow({ where: { id: officeUser(user).officeId } });
    const buffer = await this.reports.toExcel(report, q.lang ?? 'ar', office.name);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="safarni-${type}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }
}

@Module({ imports: [TripsModule], controllers: [ReportsController], providers: [DashboardService, ReportsService] })
export class ReportsModule {}
