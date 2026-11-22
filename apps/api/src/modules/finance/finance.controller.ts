import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth.types';
import { AgencyId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateExpenseDto, ExpenseQueryDto, PaymentQueryDto, UpdateExpenseDto } from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  @RequirePermission('finance.read')
  @ApiOperation({ summary: 'Collected, refunded, net revenue, expenses, profit and outstanding balances' })
  summary(@AgencyId() agencyId: string) {
    return this.finance.summary(agencyId);
  }

  @Get('payments')
  @RequirePermission('finance.read')
  listPayments(@AgencyId() agencyId: string, @Query() q: PaymentQueryDto) {
    return this.finance.listPayments(agencyId, q);
  }

  @Get('refunds')
  @RequirePermission('finance.read')
  listRefunds(@AgencyId() agencyId: string, @Query() q: PaymentQueryDto) {
    return this.finance.listRefunds(agencyId, q);
  }

  @Get('expenses')
  @RequirePermission('finance.read')
  listExpenses(@AgencyId() agencyId: string, @Query() q: ExpenseQueryDto) {
    return this.finance.listExpenses(agencyId, q);
  }

  @Post('expenses')
  @RequirePermission('finance.write')
  createExpense(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.finance.createExpense(user, dto);
  }

  @Patch('expenses/:id')
  @RequirePermission('finance.write')
  updateExpense(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExpenseDto) {
    return this.finance.updateExpense(user, id, dto);
  }

  @Delete('expenses/:id')
  @RequirePermission('finance.write')
  removeExpense(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.finance.removeExpense(user, id);
  }
}
