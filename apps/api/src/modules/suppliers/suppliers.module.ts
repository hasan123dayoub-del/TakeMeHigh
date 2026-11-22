import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelDetails } from './entities/hotel-details.entity';
import { Supplier } from './entities/supplier.entity';
import { TransportationDetails } from './entities/transportation-details.entity';
import { TripSupplier } from './entities/trip-supplier.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, HotelDetails, TransportationDetails, TripSupplier])],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
