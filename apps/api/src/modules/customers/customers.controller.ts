import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth.types';
import { AgencyId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission('customers.read')
  @ApiOperation({ summary: 'List customers with booking totals (passport numbers masked)' })
  list(@AgencyId() agencyId: string, @Query() q: CustomerQueryDto) {
    return this.customers.list(agencyId, q);
  }

  @Get(':id')
  @RequirePermission('customers.read')
  @ApiOperation({ summary: 'Customer profile with booking and payment history' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.customers.findOne(user, id);
  }

  @Post()
  @RequirePermission('customers.write')
  @ApiOperation({ summary: 'Create a customer (rejects duplicate email/phone inside the agency)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user, dto);
  }

  @Patch(':id')
  @RequirePermission('customers.write')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(user, id, dto);
  }

  @Delete(':id')
  @RequirePermission('customers.write')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.customers.remove(user, id);
  }
}
