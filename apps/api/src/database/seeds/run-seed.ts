/**
 * Seeds the demo agency. Usage:
 *   npm run db:seed           -> seeds if the demo agency does not exist yet
 *   npm run db:reset          -> wipes all TravelOS data and seeds again (local demo only)
 */
import * as bcrypt from 'bcrypt';
import type { BookingStatus, PaymentMethod } from '@travelos/shared';
import { EntityManager } from 'typeorm';
import { Decimal, toMoney } from '../../common/utils/money';
import { ActivityLog } from '../../modules/activity/entities/activity-log.entity';
import { AgencySettings } from '../../modules/agencies/entities/agency-settings.entity';
import { Agency } from '../../modules/agencies/entities/agency.entity';
import { BookingPassenger } from '../../modules/bookings/entities/booking-passenger.entity';
import { Booking } from '../../modules/bookings/entities/booking.entity';
import { Customer } from '../../modules/customers/entities/customer.entity';
import { Expense } from '../../modules/finance/entities/expense.entity';
import { Payment } from '../../modules/finance/entities/payment.entity';
import { Refund } from '../../modules/finance/entities/refund.entity';
import { HotelDetails } from '../../modules/suppliers/entities/hotel-details.entity';
import { Supplier } from '../../modules/suppliers/entities/supplier.entity';
import { TransportationDetails } from '../../modules/suppliers/entities/transportation-details.entity';
import { TripSupplier } from '../../modules/suppliers/entities/trip-supplier.entity';
import { Destination } from '../../modules/trips/entities/destination.entity';
import { TripItinerary } from '../../modules/trips/entities/trip-itinerary.entity';
import { Trip } from '../../modules/trips/entities/trip.entity';
import { User } from '../../modules/users/entities/user.entity';
import { bookingReference } from '../../modules/bookings/booking-reference';
import dataSource from '../data-source';
import * as D from './demo-data';

// Deterministic pseudo-random numbers so every reset produces the same demo.
let state = 20261122;
const rand = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const DAY = 86_400_000;
const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const atHour = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
const minDate = (a: Date, b: Date) => (a < b ? a : b);

/** Share of capacity sold per trip code, to make the dashboard tell a believable story. */
const OCCUPANCY: Record<string, number> = {
  'CAP-01': 0.77, 'PTR-02': 0.63, 'DXB-03': 0.45, 'IST-04': 0.43, 'UMR-05': 0.5,
  'BEY-06': 1, 'CAP-00': 0.83, 'PTR-00': 0.88, 'IST-00': 0.85, 'DXB-07': 0,
};
const METHODS: PaymentMethod[] = ['CASH', 'CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_WALLET'];

async function wipe(m: EntityManager) {
  await m.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of [
    'activity_logs', 'refunds', 'payments', 'booking_passengers', 'bookings', 'expenses', 'trip_suppliers',
    'trip_itineraries', 'trips', 'destinations', 'hotel_details', 'transportation_details', 'suppliers',
    'customers', 'users', 'agency_settings', 'agencies',
  ]) {
    await m.query(`DELETE FROM \`${t}\``);
  }
  await m.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function seed(m: EntityManager) {
  const agency = await m.save(m.create(Agency, D.AGENCY));
  const agencyId = agency.id;
  await m.save(m.create(AgencySettings, { ...D.SETTINGS, agencyId }));

  const passwordHash = await bcrypt.hash(D.DEMO_PASSWORD, 12);
  const users = await m.save(D.USERS.map((u) => m.create(User, { ...u, agencyId, passwordHash })));
  const [owner, , ops, agent, accountant] = users;

  const customers = await m.save(
    D.CUSTOMERS.map(([firstName, lastName, email, phone, nationality, dateOfBirth, passportNumber]) =>
      m.create(Customer, {
        agencyId, firstName, lastName, email, phone, nationality, dateOfBirth, passportNumber,
        passportExpiry: isoDate(addDays(today, between(300, 2400))),
        address: 'Damascus',
        tags: rand() > 0.6 ? ['Returning'] : rand() > 0.5 ? ['VIP'] : [],
        notes: rand() > 0.7 ? 'Prefers window seat. Contact on WhatsApp.' : null,
      }),
    ),
  );

  const destinations = new Map<string, Destination>();
  for (const d of D.DESTINATIONS) destinations.set(d.name, await m.save(m.create(Destination, { ...d, agencyId })));

  // Suppliers
  const hotels: Supplier[] = [];
  for (const h of D.HOTELS) {
    const s = await m.save(
      m.create(Supplier, {
        agencyId, type: 'HOTEL', name: h.name, contactName: h.contact, email: h.email, phone: h.phone,
        city: h.city, country: h.country, rating: h.rating, notes: 'Group rate valid for 10+ rooms.',
      }),
    );
    await m.save(
      m.create(HotelDetails, {
        supplierId: s.id, starRating: h.stars, totalRooms: h.rooms, nightlyRate: h.rate,
        roomTypes: h.roomTypes, amenities: h.amenities, checkInTime: '14:00', checkOutTime: '12:00',
      }),
    );
    hotels.push(s);
  }
  const transporters: Supplier[] = [];
  for (const t of D.TRANSPORTERS) {
    const s = await m.save(
      m.create(Supplier, {
        agencyId, type: 'TRANSPORT', name: t.name, contactName: t.contact, email: t.email, phone: t.phone,
        city: t.city, country: t.country, rating: t.rating, notes: null,
      }),
    );
    await m.save(
      m.create(TransportationDetails, {
        supplierId: s.id, vehicleType: t.vehicle, fleetSize: t.fleet, seatsPerVehicle: t.seats,
        dailyRate: t.rate, licenseNumber: t.license,
      }),
    );
    transporters.push(s);
  }
  const guide = await m.save(
    m.create(Supplier, {
      agencyId, type: 'GUIDE', name: 'Mazen Qudsi (licensed guide)', contactName: 'Mazen Qudsi',
      phone: '+963 944 777 310', city: 'Damascus', country: 'Syria', rating: 5,
      notes: 'Arabic, English and Turkish. Book 3 weeks ahead.',
    }),
  );

  const hotelFor: Record<string, Supplier> = {
    Cappadocia: hotels[0], 'Petra & Wadi Rum': hotels[1], Dubai: hotels[2], Istanbul: hotels[3],
  };
  const transportFor: Record<string, Supplier> = {
    Cappadocia: transporters[0], 'Petra & Wadi Rum': transporters[2], Dubai: transporters[3],
    Istanbul: transporters[3], 'Beirut & Byblos': transporters[1], 'Makkah & Madinah': transporters[3],
  };

  const logs: Partial<ActivityLog>[] = [];
  let bookingCount = 0;

  for (const t of D.TRIPS) {
    const departure = addDays(today, t.offset);
    const destination = destinations.get(t.destination)!;
    const trip = await m.save(
      m.create(Trip, {
        agencyId, code: t.code, title: t.title,
        slug: t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        destinationId: destination.id,
        summary: destination.description,
        description: `${t.title}: ${t.nights} nights with accommodation, transport, guided visits and a dedicated tour leader from our team.`,
        departureDate: isoDate(departure), returnDate: isoDate(addDays(departure, t.nights)),
        departureLocation: t.from, capacity: t.capacity, seatsBooked: 0,
        pricePerPerson: t.price, childPrice: t.child, costPerPerson: t.cost,
        status: t.status, isPublic: t.isPublic,
        offerPrice: t.offer?.price ?? null, offerLabel: t.offer?.label ?? null,
        offerEndsAt: t.offer?.endsInDays != null ? isoDate(addDays(today, t.offer.endsInDays)) : null,
        inclusions: ['Accommodation with breakfast', 'Transport throughout', 'Licensed guide', 'Entrance fees'],
        exclusions: ['Personal expenses', 'Travel insurance', 'Optional activities'],
      }),
    );

    const itinerary = D.ITINERARIES[t.code] ?? [
      ['Departure', `Meet at ${t.from} and travel to ${destination.city}.`, destination.city ?? ''],
      ['Guided highlights', `Full-day guided visit of ${destination.name}.`, destination.city ?? ''],
      ['Return', 'Free morning, then the journey home.', 'Damascus'],
    ];
    await m.save(
      itinerary.map(([title, description, location], i) =>
        m.create(TripItinerary, { agencyId, tripId: trip.id, dayNumber: i + 1, title, description, location }),
      ),
    );

    // Supplier services for the trip (drives cost reporting)
    const services: Partial<TripSupplier>[] = [];
    const hotel = hotelFor[t.destination];
    const rooms = Math.ceil(t.capacity / 2);
    if (hotel) {
      const hotelDetails = await m.findOneByOrFail(HotelDetails, { supplierId: hotel.id });
      const qty = rooms * t.nights;
      services.push({ supplierId: hotel.id, service: `${rooms} rooms × ${t.nights} nights`, quantity: qty, unitCost: hotelDetails.nightlyRate, totalCost: toMoney(new Decimal(hotelDetails.nightlyRate).mul(qty)) });
    }
    const transport = transportFor[t.destination];
    if (transport) {
      const td = await m.findOneByOrFail(TransportationDetails, { supplierId: transport.id });
      const days = t.nights + 1;
      const isFlight = td.vehicleType === 'FLIGHT';
      services.push(
        isFlight
          ? { supplierId: transport.id, service: `Group flight tickets (${t.capacity} seats)`, quantity: t.capacity, unitCost: '260.00', totalCost: toMoney(new Decimal(260).mul(t.capacity)) }
          : { supplierId: transport.id, service: `Coach with driver × ${days} days`, quantity: days, unitCost: td.dailyRate, totalCost: toMoney(new Decimal(td.dailyRate).mul(days)) },
      );
    }
    if (t.offset > -100) {
      services.push({ supplierId: guide.id, service: `Guide × ${t.nights + 1} days`, quantity: t.nights + 1, unitCost: '60.00', totalCost: toMoney(new Decimal(60).mul(t.nights + 1)) });
    }
    await m.save(services.map((s) => m.create(TripSupplier, { ...s, agencyId, tripId: trip.id })));

    // Bookings
    const target = Math.round(t.capacity * (OCCUPANCY[t.code] ?? 0));
    let held = 0;
    const isPast = t.offset < 0;
    let n = 0;
    while (held < target) {
      n += 1;
      const adults = Math.min(between(1, 3), target - held);
      const children = adults < target - held && rand() > 0.65 ? Math.min(between(1, 2), target - held - adults) : 0;
      const seats = adults + children;
      const customer = pick(customers);
      const windowStart = addDays(departure, -between(18, 70));
      const createdAt = atHour(minDate(windowStart, addDays(today, -between(0, 3))), between(8, 18));

      let status: BookingStatus;
      if (isPast) status = 'COMPLETED';
      else if (t.code === 'BEY-06') status = 'CONFIRMED';
      else status = rand() > 0.72 ? 'PENDING' : 'CONFIRMED';

      const unitPrice = new Decimal(t.price);
      const childUnit = new Decimal(t.child);
      const subtotal = unitPrice.mul(adults).add(childUnit.mul(children));
      const discount = rand() > 0.85 ? new Decimal(25).mul(seats) : new Decimal(0);
      const total = subtotal.sub(discount);

      const booking = await m.save(
        m.create(Booking, {
          agencyId, reference: bookingReference(), tripId: trip.id, customerId: customer.id, status,
          source: pick(['OFFICE', 'OFFICE', 'PHONE', 'WHATSAPP', 'PUBLIC_PAGE'] as const),
          adults, children, seats,
          unitPrice: toMoney(unitPrice), childUnitPrice: toMoney(childUnit),
          subtotal: toMoney(subtotal), discount: toMoney(discount), totalAmount: toMoney(total),
          paidAmount: '0.00', refundedAmount: '0.00', paymentStatus: 'UNPAID',
          notes: rand() > 0.8 ? 'Requested adjoining rooms.' : null,
          specialRequests: rand() > 0.85 ? 'Vegetarian meals' : null,
          confirmedAt: status === 'PENDING' ? null : addDays(createdAt, 1),
          createdById: pick([agent, agent, ops, owner]).id,
        }),
      );
      await m.update(Booking, { id: booking.id }, { createdAt });
      held += seats;
      bookingCount += 1;

      await m.save(
        Array.from({ length: seats }, (_, i) =>
          m.create(BookingPassenger, {
            agencyId, bookingId: booking.id,
            fullName: i === 0 ? `${customer.firstName} ${customer.lastName}` : `${pick(['Ali', 'Jana', 'Karim', 'Lana', 'Hadi', 'Rima'])} ${customer.lastName}`,
            type: i < adults ? 'ADULT' : 'CHILD',
            nationality: customer.nationality,
          }),
        ),
      );

      // Payments: deposit first, then (sometimes) the balance.
      let paid = new Decimal(0);
      const payments: Partial<Payment>[] = [];
      if (status !== 'PENDING') {
        const deposit = total.mul(0.3).toDecimalPlaces(2);
        const depositAt = atHour(addDays(createdAt, between(0, 2)), 2);
        payments.push({ amount: toMoney(deposit), isDeposit: true, paidAt: minDate(depositAt, addDays(today, 0)) });
        paid = paid.add(deposit);
        // Most travellers settle before departure; a few near-departure balances stay open (shown as overdue).
        const settle = isPast ? rand() > 0.12 : t.offset <= 10 ? rand() > 0.4 : rand() > 0.5;
        if (settle) {
          const balance = total.sub(deposit);
          const balanceAt = minDate(addDays(departure, -between(7, 14)), atHour(addDays(today, -between(0, 6)), 4));
          payments.push({ amount: toMoney(balance), isDeposit: false, paidAt: balanceAt < depositAt ? depositAt : balanceAt });
          paid = paid.add(balance);
        }
      } else if (rand() > 0.6) {
        const deposit = total.mul(0.3).toDecimalPlaces(2);
        payments.push({ amount: toMoney(deposit), isDeposit: true, paidAt: atHour(createdAt, 3) });
        paid = paid.add(deposit);
      }
      for (const p of payments) {
        await m.save(
          m.create(Payment, {
            ...p, agencyId, bookingId: booking.id, method: pick(METHODS),
            reference: `RCPT-${between(10000, 99999)}`, receivedById: pick([accountant, agent]).id,
          }),
        );
      }
      const paymentStatus = paid.isZero() ? 'UNPAID' : paid.gte(total) ? 'PAID' : 'PARTIAL';
      await m.update(Booking, { id: booking.id }, { paidAmount: toMoney(paid), paymentStatus });

      if (!isPast && createdAt > addDays(today, -6)) {
        logs.push({ agencyId, userId: booking.createdById, action: 'booking.created', entityType: 'booking', entityId: booking.id, summary: `New booking ${booking.reference} · ${seats} seat(s) on ${t.title}`, createdAt });
      }
      if (n > 200) break;
    }

    // A cancelled booking with a refund on two upcoming trips, to show the full lifecycle.
    if (['CAP-01', 'IST-04'].includes(t.code)) {
      const customer = pick(customers);
      const total = new Decimal(t.price).mul(2);
      const createdAt = addDays(today, -between(12, 20));
      const cancelled = await m.save(
        m.create(Booking, {
          agencyId, reference: bookingReference(), tripId: trip.id, customerId: customer.id, status: 'CANCELLED',
          source: 'PHONE', adults: 2, children: 0, seats: 2, unitPrice: t.price, childUnitPrice: t.child,
          subtotal: toMoney(total), discount: '0.00', totalAmount: toMoney(total),
          paidAmount: '0.00', refundedAmount: '0.00', paymentStatus: 'REFUNDED',
          confirmedAt: addDays(createdAt, 1), cancelledAt: addDays(today, -2),
          cancellationReason: 'Family emergency, customer asked to cancel.', createdById: agent.id,
        }),
      );
      await m.update(Booking, { id: cancelled.id }, { createdAt });
      const deposit = total.mul(0.3).toDecimalPlaces(2);
      await m.save(m.create(Payment, { agencyId, bookingId: cancelled.id, amount: toMoney(deposit), method: 'CASH', isDeposit: true, paidAt: addDays(createdAt, 1), receivedById: accountant.id }));
      const refund = deposit.mul(0.5).toDecimalPlaces(2);
      await m.save(m.create(Refund, { agencyId, bookingId: cancelled.id, amount: toMoney(refund), method: 'CASH', reason: 'Cancellation: 50% of deposit returned per policy', refundedAt: addDays(today, -2), processedById: accountant.id }));
      await m.update(Booking, { id: cancelled.id }, { paidAmount: toMoney(deposit.sub(refund)), refundedAmount: toMoney(refund), paymentStatus: 'REFUNDED' });
      logs.push({ agencyId, userId: agent.id, action: 'booking.cancelled', entityType: 'booking', entityId: cancelled.id, summary: `Booking ${cancelled.reference} cancelled · refund ${toMoney(refund)} USD`, createdAt: addDays(today, -2) });
      bookingCount += 1;
    }

    await m.update(Trip, { id: trip.id }, { seatsBooked: held });

    // Supplier costs actually paid for completed trips
    if (isPast) {
      for (const s of services) {
        await m.save(
          m.create(Expense, {
            agencyId, tripId: trip.id, supplierId: s.supplierId!, category: s.supplierId === hotel?.id ? 'ACCOMMODATION' : s.supplierId === guide.id ? 'GUIDES' : 'TRANSPORT',
            description: `${t.code}: ${s.service}`, amount: s.totalCost!, expenseDate: isoDate(addDays(departure, -5)),
            reference: `INV-${between(1000, 9999)}`, createdById: accountant.id,
          }),
        );
      }
    }
  }

  // Monthly overheads for the last six months
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 3));
    const overheads: Array<[Expense['category'], string, string]> = [
      ['OFFICE', 'Office rent', '650.00'],
      ['SALARIES', 'Staff salaries', '3200.00'],
      ['MARKETING', 'Social media ads', toMoney(between(120, 280))],
    ];
    for (const [category, description, amount] of overheads) {
      await m.save(m.create(Expense, { agencyId, category, description, amount, expenseDate: isoDate(d), createdById: accountant.id }));
    }
  }

  logs.push(
    { agencyId, userId: ops.id, action: 'trip.published', entityType: 'trip', summary: 'Published "Umrah Journey: Spring Group" on the public page', createdAt: addDays(today, -4) },
    { agencyId, userId: ops.id, action: 'trip.full', entityType: 'trip', summary: '"Beirut & Byblos Coastal Break" is now fully booked', createdAt: addDays(today, -1) },
    { agencyId, userId: accountant.id, action: 'expense.recorded', entityType: 'expense', summary: 'Recorded office rent for this month', createdAt: atHour(today, 9) },
  );
  await m.save(logs.map((l) => m.create(ActivityLog, l)));

  return { agency: agency.name, users: users.length, customers: customers.length, trips: D.TRIPS.length, bookings: bookingCount };
}

async function main() {
  const reset = process.argv.includes('--reset');
  await dataSource.initialize();
  try {
    const exists = await dataSource.getRepository(Agency).existsBy({ slug: D.AGENCY.slug });
    if (exists && !reset) {
      console.log('Demo agency already exists. Use "npm run db:reset" to wipe and reseed.');
      return;
    }
    const summary = await dataSource.transaction(async (m) => {
      if (reset) await wipe(m);
      return seed(m);
    });
    console.log('Seed complete:', summary);
    console.log(`Demo login: ${D.USERS[0].email} / ${D.DEMO_PASSWORD} (see docs/DEMO.md for all roles)`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
