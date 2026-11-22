import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth.types';
import { likeTerm, paginate } from '../../common/dto/pagination.dto';
import { toMoney } from '../../common/utils/money';
import { findOwned } from '../../common/utils/tenant';
import { ActivityService } from '../activity/activity.service';
import { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from './dto/supplier.dto';
import { HotelDetails } from './entities/hotel-details.entity';
import { Supplier } from './entities/supplier.entity';
import { TransportationDetails } from './entities/transportation-details.entity';
import { TripSupplier } from './entities/trip-supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly activity: ActivityService,
  ) {}

  async list(agencyId: string, q: SupplierQueryDto) {
    const qb = this.suppliers
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.hotel', 'h')
      .leftJoinAndSelect('s.transport', 'tr')
      .where('s.agencyId = :agencyId', { agencyId });
    if (q.type) qb.andWhere('s.type = :type', { type: q.type });
    if (q.search) {
      qb.andWhere('(s.name LIKE :s OR s.city LIKE :s OR s.contactName LIKE :s)', { s: likeTerm(q.search) });
    }
    const [rows, total] = await qb
      .orderBy('s.name', 'ASC')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize)
      .getManyAndCount();

    const ids = rows.map((r) => r.id);
    const usage = new Map<string, { trips: number; committed: string }>();
    if (ids.length) {
      const agg: Array<Record<string, string>> = await this.db.query(
        `SELECT supplier_id AS id, COUNT(DISTINCT trip_id) AS trips, COALESCE(SUM(total_cost), 0) AS committed
         FROM trip_suppliers WHERE agency_id = ? AND supplier_id IN (?) GROUP BY supplier_id`,
        [agencyId, ids],
      );
      for (const a of agg) usage.set(a.id, { trips: Number(a.trips), committed: toMoney(a.committed) });
    }
    return paginate(
      rows.map((s) => ({ ...s, usage: usage.get(s.id) ?? { trips: 0, committed: '0.00' } })),
      total,
      q.page,
      q.pageSize,
    );
  }

  async findOne(agencyId: string, id: string) {
    const supplier = await findOwned(this.suppliers, id, agencyId, { hotel: true, transport: true }, 'Supplier');
    const services = await this.db.getRepository(TripSupplier).find({
      where: { supplierId: id, agencyId },
      relations: { trip: true },
      order: { createdAt: 'DESC' },
    });
    const [paid] = await this.db.query(
      'SELECT COALESCE(SUM(amount), 0) AS paid FROM expenses WHERE agency_id = ? AND supplier_id = ?',
      [agencyId, id],
    );
    return {
      ...supplier,
      services: services.map((s) => ({
        id: s.id,
        service: s.service,
        quantity: s.quantity,
        unitCost: s.unitCost,
        totalCost: s.totalCost,
        trip: s.trip
          ? { id: s.trip.id, code: s.trip.code, title: s.trip.title, departureDate: s.trip.departureDate, status: s.trip.status }
          : null,
      })),
      totals: {
        committed: toMoney(services.reduce((sum, s) => sum + Number(s.totalCost), 0)),
        paid: toMoney(paid.paid),
      },
    };
  }

  async create(user: AuthUser, dto: CreateSupplierDto) {
    this.assertDetailsMatchType(dto.type, dto);
    const id = await this.db.transaction(async (m) => {
      const { hotel, transport, ...base } = dto;
      const supplier = await m.save(m.create(Supplier, { ...base, agencyId: user.agencyId }));
      if (dto.type === 'HOTEL') {
        await m.save(m.create(HotelDetails, { ...(hotel ?? {}), supplierId: supplier.id }));
      }
      if (dto.type === 'TRANSPORT') {
        await m.save(m.create(TransportationDetails, { ...(transport ?? {}), supplierId: supplier.id }));
      }
      await this.activity.log(
        {
          agencyId: user.agencyId,
          userId: user.userId,
          action: 'supplier.created',
          entityType: 'supplier',
          entityId: supplier.id,
          summary: `Added ${dto.type.toLowerCase()} supplier "${supplier.name}"`,
        },
        m,
      );
      return supplier.id;
    });
    return this.findOne(user.agencyId, id);
  }

  async update(user: AuthUser, id: string, dto: UpdateSupplierDto) {
    const supplier = await findOwned(this.suppliers, id, user.agencyId, { hotel: true, transport: true }, 'Supplier');
    if (dto.type && dto.type !== supplier.type) {
      throw new BadRequestException('Supplier type cannot be changed. Create a new supplier instead.');
    }
    this.assertDetailsMatchType(supplier.type, dto);
    await this.db.transaction(async (m) => {
      const { hotel, transport, ...base } = dto;
      await m.update(Supplier, { id, agencyId: user.agencyId }, base);
      if (hotel) {
        if (supplier.hotel) await m.update(HotelDetails, { supplierId: id }, hotel);
        else await m.save(m.create(HotelDetails, { ...hotel, supplierId: id }));
      }
      if (transport) {
        if (supplier.transport) await m.update(TransportationDetails, { supplierId: id }, transport);
        else await m.save(m.create(TransportationDetails, { ...transport, supplierId: id }));
      }
    });
    return this.findOne(user.agencyId, id);
  }

  async remove(user: AuthUser, id: string) {
    const supplier = await findOwned(this.suppliers, id, user.agencyId, undefined, 'Supplier');
    const used = await this.db.getRepository(TripSupplier).countBy({ supplierId: id, agencyId: user.agencyId });
    if (used) {
      throw new ConflictException('This supplier is attached to trips. Mark it inactive instead of deleting it.');
    }
    await this.suppliers.delete({ id, agencyId: user.agencyId });
    await this.activity.log({
      agencyId: user.agencyId,
      userId: user.userId,
      action: 'supplier.deleted',
      entityType: 'supplier',
      entityId: id,
      summary: `Deleted supplier "${supplier.name}"`,
    });
    return { deleted: true };
  }

  private assertDetailsMatchType(type: string, dto: UpdateSupplierDto) {
    if (dto.hotel && type !== 'HOTEL') throw new BadRequestException('Hotel details are only allowed for hotels');
    if (dto.transport && type !== 'TRANSPORT') {
      throw new BadRequestException('Transport details are only allowed for transport suppliers');
    }
  }
}
