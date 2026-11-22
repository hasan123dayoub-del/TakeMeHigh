import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { TripSupplier } from '../suppliers/entities/trip-supplier.entity';
import { Destination } from './entities/destination.entity';
import { TripItinerary } from './entities/trip-itinerary.entity';
import { Trip } from './entities/trip.entity';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, Destination, TripItinerary, TripSupplier, Supplier])],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
