import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth.types';
import { AgencyId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermission('suppliers.read')
  @ApiOperation({ summary: 'List hotels, transport companies and other suppliers (filter by type)' })
  list(@AgencyId() agencyId: string, @Query() q: SupplierQueryDto) {
    return this.suppliers.list(agencyId, q);
  }

  @Get(':id')
  @RequirePermission('suppliers.read')
  @ApiOperation({ summary: 'Supplier with details, trips served and committed vs paid amounts' })
  findOne(@AgencyId() agencyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.findOne(agencyId, id);
  }

  @Post()
  @RequirePermission('suppliers.write')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(user, dto);
  }

  @Patch(':id')
  @RequirePermission('suppliers.write')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(user, id, dto);
  }

  @Delete(':id')
  @RequirePermission('suppliers.write')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.remove(user, id);
  }
}
