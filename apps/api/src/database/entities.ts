import { ActivityLog } from '../modules/activity/entities/activity-log.entity';
import { AgencySettings } from '../modules/agencies/entities/agency-settings.entity';
import { Agency } from '../modules/agencies/entities/agency.entity';
import { BookingPassenger } from '../modules/bookings/entities/booking-passenger.entity';
import { Booking } from '../modules/bookings/entities/booking.entity';
import { Customer } from '../modules/customers/entities/customer.entity';
import { Expense } from '../modules/finance/entities/expense.entity';
import { Payment } from '../modules/finance/entities/payment.entity';
import { Refund } from '../modules/finance/entities/refund.entity';
import { HotelDetails } from '../modules/suppliers/entities/hotel-details.entity';
import { Supplier } from '../modules/suppliers/entities/supplier.entity';
import { TransportationDetails } from '../modules/suppliers/entities/transportation-details.entity';
import { TripSupplier } from '../modules/suppliers/entities/trip-supplier.entity';
import { Destination } from '../modules/trips/entities/destination.entity';
import { TripItinerary } from '../modules/trips/entities/trip-itinerary.entity';
import { Trip } from '../modules/trips/entities/trip.entity';
import { User } from '../modules/users/entities/user.entity';

export const ENTITIES = [
  Agency,
  AgencySettings,
  User,
  Customer,
  Destination,
  Trip,
  TripItinerary,
  Supplier,
  HotelDetails,
  TransportationDetails,
  TripSupplier,
  Booking,
  BookingPassenger,
  Payment,
  Refund,
  Expense,
  ActivityLog,
];
