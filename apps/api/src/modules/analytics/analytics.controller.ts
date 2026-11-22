import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { AgencyId, RequirePermission } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';

class ReportRangeDto {
  /** YYYY-MM-DD, defaults to 12 months ago */
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  /** YYYY-MM-DD, defaults to today */
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
}

@ApiTags('Dashboard & Reports')
@ApiBearerAuth()
@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermission('bookings.read')
  @ApiOperation({ summary: 'KPIs, upcoming departures, revenue by month, booking trend and recent activity' })
  dashboard(@AgencyId() agencyId: string) {
    return this.analytics.dashboard(agencyId);
  }

  @Get('reports')
  @RequirePermission('reports.read')
  @ApiOperation({
    summary: 'Revenue by period, popular trips, seat utilization, outstanding balances, trip profitability',
  })
  reports(@AgencyId() agencyId: string, @Query() q: ReportRangeDto) {
    return this.analytics.reports(agencyId, q.from, q.to);
  }
}
