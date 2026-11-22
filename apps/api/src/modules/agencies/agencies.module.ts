import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AgenciesController } from './agencies.controller';
import { AgenciesService } from './agencies.service';
import { AgencySettings } from './entities/agency-settings.entity';
import { Agency } from './entities/agency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agency, AgencySettings, User])],
  controllers: [AgenciesController],
  providers: [AgenciesService],
})
export class AgenciesModule {}
