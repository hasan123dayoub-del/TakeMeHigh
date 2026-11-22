import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Refund, Expense])],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
