import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth.types';
import { AgencyId, CurrentUser, RequirePermission } from '../../common/decorators';
import { CreateUserDto, UpdateAgencyDto, UpdateUserDto } from './agencies.dto';
import { AgenciesService } from './agencies.service';

@ApiTags('Agency & team')
@ApiBearerAuth()
@Controller()
export class AgenciesController {
  constructor(private readonly agencies: AgenciesService) {}

  @Get('agency')
  @ApiOperation({ summary: 'Current agency profile and settings' })
  get(@AgencyId() agencyId: string) {
    return this.agencies.get(agencyId);
  }

  @Patch('agency')
  @RequirePermission('settings.manage')
  @ApiOperation({ summary: 'Update agency profile, public page and booking policy' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateAgencyDto) {
    return this.agencies.update(user, dto);
  }

  @Get('users')
  @RequirePermission('users.manage')
  listUsers(@AgencyId() agencyId: string) {
    return this.agencies.listUsers(agencyId);
  }

  @Post('users')
  @RequirePermission('users.manage')
  createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.agencies.createUser(user, dto);
  }

  @Patch('users/:id')
  @RequirePermission('users.manage')
  updateUser(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.agencies.updateUser(user, id, dto);
  }
}
