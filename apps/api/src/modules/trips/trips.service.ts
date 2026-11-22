import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth.types';
import { likeTerm, paginate } from '../../common/dto/pagination.dto';
import { Decimal, toMoney } from '../../common/utils/money';
import { findOwned, lockOwned } from '../../common/utils/tenant';
import { ActivityService } from '../activity/activity.service';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { TripSupplier } from '../suppliers/entities/trip-supplier.entity';
import {
  AddTripSupplierDto,
  CreateDestinationDto,
  CreateTripDto,
  ReplaceItineraryDto,
  TripQueryDto,
  UpdateTripDto,
} from './dto/trip.dto';
import { Destination } from './entities/destination.entity';
import { TripItinerary } from './entities/trip-itinerary.entity';
import { Trip } from './entities/trip.entity';
import { activeOffer, effectiveAdultPrice } from './pricing';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 160);

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(Destination) private readonly destinations: Repository<Destination>,
    @InjectRepository(TripSupplier) private readonly tripSuppliers: Repository<TripSupplier>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly activity: ActivityService,
  ) {}

  // ---------- destinations ----------

  listDestinations(agencyId: string) {
    return this.destinations.find({ where: { agencyId }, order: { name: 'ASC' } });
  }

  async createDestination(user: AuthUser, dto: CreateDestinationDto) {
    return this.destinations.save(this.destinations.create({ ...dto, agencyId: user.agencyId }));
  }

  // ---------- trips ----------

  async list(agencyId: string, q: TripQueryDto) {
    const qb = this.trips
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.destination', 'd')
      .where('t.agencyId = :agencyId', { agencyId });

    if (q.status) qb.andWhere('t.status = :status', { status: q.status });
    if (q.destinationId) qb.andWhere('t.destinationId = :destinationId', { destinationId: q.destinationId });
    if (q.when === 'upcoming') qb.andWhere('t.departureDate >= CURRENT_DATE()');
    if (q.when === 'past') qb.andWhere('t.departureDate < CURRENT_DATE()');
    if (q.search) {
      qb.andWhere('(t.title LIKE :s OR t.code LIKE :s OR d.name LIKE :s)', { s: likeTerm(q.search) });
    }

    const order = q.when === 'upcoming' ? 'ASC' : q.order;
    const [rows, total] = await qb
      .orderBy('t.departureDate', order)
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();

    return paginate(rows.map((t) => this.present(t)), total, q.page, q.pageSize);
  }

  async findOne(agencyId: string, id: string) {
    const trip = await findOwned(this.trips, id, agencyId, { destination: true }, 'Trip');
    const [itinerary, services, stats] = await Promise.all([
      this.db.getRepository(TripItinerary).find({ where: { tripId: id, agencyId }, order: { dayNumber: 'ASC' } }),
      this.tripSuppliers.find({
        where: { tripId: id, agencyId },
        relations: { supplier: true },
        order: { createdAt: 'ASC' },
      }),
      this.bookingStats(agencyId, id),
    ]);

    const supplierCost = services.reduce((sum, s) => sum.add(s.totalCost), new Decimal(0));
    return {
      ...this.present(trip),
      itinerary,
      suppliers: services.map((s) => ({
        id: s.id,
        service: s.service,
        quantity: s.quantity,
        unitCost: s.unitCost,
        totalCost: s.totalCost,
        notes: s.notes,
        supplier: s.supplier ? { id: s.supplier.id, name: s.supplier.name, type: s.supplier.type } : null,
      })),
      financials: {
        ...stats,
        supplierCost: toMoney(supplierCost),
        projectedMargin: toMoney(new Decimal(stats.bookedValue).sub(supplierCost)),
      },
    };
  }

  async create(user: AuthUser, dto: CreateTripDto) {
    this.assertDates(dto.departureDate, dto.returnDate);
    this.assertOffer(dto.pricePerPerson, dto.offerPrice);
    await findOwned(this.destinations, dto.destinationId, user.agencyId, undefined, 'Destination');

    const trip = await this.trips.save(
      this.trips.create({
        ...dto,
        code: dto.code.toUpperCase(),
        agencyId: user.agencyId,
        slug: slugify(dto.title),
        seatsBooked: 0,
        costPerPerson: dto.costPerPerson ?? '0.00',
        childPrice: dto.childPrice ?? null,
        status: dto.status ?? 'DRAFT',
        isPublic: dto.isPublic ?? false,
      }),
    );
    await this.activity.log({
      agencyId: user.agencyId,
      userId: user.userId,
      action: 'trip.created',
      entityType: 'trip',
      entityId: trip.id,
      summary: `Created trip "${trip.title}" (${trip.code})`,
    });
    return this.findOne(user.agencyId, trip.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateTripDto) {
    // Lock the row so a capacity change cannot race with a booking taking seats.
    await this.db.transaction(async (m) => {
      const trip = await lockOwned(m, Trip, id, user.agencyId, 'Trip');
      const previousStatus = trip.status;

      if (dto.destinationId) await findOwned(m.getRepository(Destination), dto.destinationId, user.agencyId, undefined, 'Destination');
      this.assertDates(dto.departureDate ?? trip.departureDate, dto.returnDate ?? trip.returnDate);
      this.assertOffer(
        dto.pricePerPerson ?? trip.pricePerPerson,
        dto.offerPrice === undefined ? trip.offerPrice : dto.offerPrice,
      );

      const capacity = dto.capacity ?? trip.capacity;
      if (capacity < trip.seatsBooked) {
        throw new ConflictException(
          `Capacity cannot be lower than the ${trip.seatsBooked} seats already booked. Cancel bookings first.`,
        );
      }

      let status = dto.status ?? trip.status;
      // Keep FULL/PUBLISHED in sync with availability when capacity changes.
      if (status === 'FULL' && trip.seatsBooked < capacity) status = 'PUBLISHED';
      if (status === 'PUBLISHED' && trip.seatsBooked >= capacity) status = 'FULL';

      Object.assign(trip, {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : trip.code,
        slug: dto.title ? slugify(dto.title) : trip.slug,
        capacity,
        status,
      });
      await m.save(trip);
      await this.activity.log(
        {
          agencyId: user.agencyId,
          userId: user.userId,
          action: status !== previousStatus ? `trip.${status.toLowerCase()}` : 'trip.updated',
          entityType: 'trip',
          entityId: id,
          summary: `Updated trip "${trip.title}"`,
        },
        m,
      );
    });
    return this.findOne(user.agencyId, id);
  }

  async remove(user: AuthUser, id: string) {
    const trip = await findOwned(this.trips, id, user.agencyId, undefined, 'Trip');
    const bookings = await this.db.query('SELECT COUNT(*) AS n FROM bookings WHERE trip_id = ? AND agency_id = ?', [
      id,
      user.agencyId,
    ]);
    if (Number(bookings[0].n) > 0) {
      throw new ConflictException('This trip has bookings. Set its status to Cancelled instead of deleting it.');
    }
    await this.trips.delete({ id, agencyId: user.agencyId });
    await this.activity.log({
      agencyId: user.agencyId,
      userId: user.userId,
      action: 'trip.deleted',
      entityType: 'trip',
      entityId: id,
      summary: `Deleted draft trip "${trip.title}"`,
    });
    return { deleted: true };
  }

  async replaceItinerary(user: AuthUser, id: string, dto: ReplaceItineraryDto) {
    await findOwned(this.trips, id, user.agencyId, undefined, 'Trip');
    const days = new Set(dto.days.map((d) => d.dayNumber));
    if (days.size !== dto.days.length) throw new BadRequestException('Each day number must be unique');

    await this.db.transaction(async (m) => {
      await m.delete(TripItinerary, { tripId: id, agencyId: user.agencyId });
      if (dto.days.length) {
        await m.save(dto.days.map((d) => m.create(TripItinerary, { ...d, tripId: id, agencyId: user.agencyId })));
      }
    });
    return this.db
      .getRepository(TripItinerary)
      .find({ where: { tripId: id, agencyId: user.agencyId }, order: { dayNumber: 'ASC' } });
  }

  async addSupplier(user: AuthUser, tripId: string, dto: AddTripSupplierDto) {
    await findOwned(this.trips, tripId, user.agencyId, undefined, 'Trip');
    await findOwned(this.suppliers, dto.supplierId, user.agencyId, undefined, 'Supplier');
    const row = await this.tripSuppliers.save(
      this.tripSuppliers.create({
        ...dto,
        notes: dto.notes ?? null,
        tripId,
        agencyId: user.agencyId,
        totalCost: toMoney(new Decimal(dto.unitCost).mul(dto.quantity)),
      }),
    );
    return row;
  }

  async removeSupplier(user: AuthUser, tripId: string, tripSupplierId: string) {
    const res = await this.tripSuppliers.delete({ id: tripSupplierId, tripId, agencyId: user.agencyId });
    if (!res.affected) throw new BadRequestException('Supplier service not found on this trip');
    return { deleted: true };
  }

  /** Lightweight list for selects (booking form, expense form). */
  async options(agencyId: string) {
    const rows = await this.trips.find({
      where: { agencyId, status: In(['PUBLISHED', 'FULL', 'IN_PROGRESS', 'DRAFT']) },
      order: { departureDate: 'ASC' },
      select: {
        id: true,
        code: true,
        title: true,
        departureDate: true,
        capacity: true,
        seatsBooked: true,
        pricePerPerson: true,
        childPrice: true,
        status: true,
      },
    });
    return rows.map((t) => ({ ...t, seatsAvailable: t.capacity - t.seatsBooked }));
  }

  // ---------- helpers ----------

  private async bookingStats(agencyId: string, tripId: string) {
    const [row] = await this.db.query(
      `SELECT
         COUNT(*) AS bookings,
         COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status <> 'CANCELLED' THEN total_amount ELSE 0 END), 0) AS bookedValue,
         COALESCE(SUM(paid_amount), 0) AS collected,
         COALESCE(SUM(CASE WHEN status <> 'CANCELLED' THEN total_amount - paid_amount ELSE 0 END), 0) AS outstanding
       FROM bookings WHERE agency_id = ? AND trip_id = ?`,
      [agencyId, tripId],
    );
    return {
      bookings: Number(row.bookings),
      pendingBookings: Number(row.pending),
      bookedValue: toMoney(row.bookedValue),
      collected: toMoney(row.collected),
      outstanding: toMoney(row.outstanding),
    };
  }

  private assertDates(departure: string, ret: string) {
    if (ret < departure) throw new BadRequestException('Return date must be on or after the departure date');
  }

  private assertOffer(price: string, offer?: string | null) {
    if (offer != null && !(new Decimal(offer).gt(0) && new Decimal(offer).lt(price))) {
      throw new BadRequestException('The offer price must be above zero and below the normal price');
    }
  }

  present(t: Trip) {
    return {
      ...t,
      activeOffer: activeOffer(t),
      currentPrice: effectiveAdultPrice(t),
      seatsAvailable: t.capacity - t.seatsBooked,
      occupancy: t.capacity ? Math.round((t.seatsBooked / t.capacity) * 100) : 0,
    };
  }
}
