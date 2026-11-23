import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService, diff } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import {
  ilike,
  orderArgs,
  pageArgs,
  paginate,
} from '../common/dto/pagination.dto';
import { sellingPrice, toMoney } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';
import { SuppliersService } from '../suppliers/suppliers.module';
import type {
  CreateOfferDto,
  OfferLineDto,
  OfferQueryDto,
  UpdateOfferDto,
} from './products.dto';
import {
  bundleTotals,
  distinctCoreServices,
  isOfferLive,
  lineCost,
} from './rules';

const include = {
  currency: true,
  lines: {
    include: {
      item: {
        select: {
          id: true,
          name: true,
          costPerPerson: true,
          currencyCode: true,
          company: { select: { id: true, name: true, transportMode: true } },
          toCity: { select: { nameAr: true } },
        },
      },
      service: { select: { id: true, kind: true, nameAr: true, nameEn: true } },
    },
    orderBy: { sequenceNo: 'asc' },
  },
  targets: {
    include: {
      trip: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          pricePerPerson: true,
          currencyCode: true,
        },
      },
      program: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          pricePerPerson: true,
          currencyCode: true,
        },
      },
    },
  },
  _count: { select: { bookings: { where: { status: { not: 'CANCELLED' } } } } },
} satisfies Prisma.OfferInclude;
type OfferRow = Prisma.OfferGetPayload<{ include: typeof include }>;

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly suppliers: SuppliersService,
  ) {}

  private shape(user: AuthUser, o: OfferRow) {
    const breakdown = user.permissions.includes('pricing.view_breakdown');
    return {
      ...o,
      live: isOfferLive(o),
      availableSeats:
        o.maxSeats === null ? null : Math.max(0, o.maxSeats - o.confirmedSeats),
      costPerPerson: breakdown ? o.costPerPerson : undefined,
      lines: o.lines.map((l) => ({
        ...l,
        costSnapshot: breakdown ? l.costSnapshot : undefined,
        unitCost: breakdown ? l.unitCost : undefined,
        profitMode: breakdown ? l.profitMode : undefined,
        profitValue: breakdown ? l.profitValue : undefined,
        sellingPrice: breakdown ? l.sellingPrice : undefined,
        item: {
          ...l.item,
          costPerPerson: breakdown ? l.item.costPerPerson : undefined,
        },
      })),
    };
  }

  async list(user: AuthUser, q: OfferQueryDto) {
    const today = day(new Date().toISOString().slice(0, 10));
    const where: Prisma.OfferWhereInput = {
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.live
        ? { isActive: true, validFrom: { lte: today }, validTo: { gte: today } }
        : {}),
      ...(q.search
        ? { OR: [{ title: ilike(q.search) }, { description: ilike(q.search) }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.offer.findMany({
        where,
        include,
        orderBy: orderArgs(
          q,
          ['createdAt', 'validFrom', 'validTo', 'title'] as const,
          'createdAt',
        ),
        ...pageArgs(q),
      }),
      this.prisma.offer.count({ where }),
    ]);
    return paginate(
      rows.map((o) => this.shape(user, o)),
      total,
      q,
    );
  }

  async get(user: AuthUser, id: string) {
    const o = await this.prisma.offer.findUnique({ where: { id }, include });
    if (!o) throw new NotFoundException('Offer not found');
    return this.shape(user, o);
  }

  async create(user: AuthUser, dto: CreateOfferDto) {
    this.validateBase(dto.kind, dto);
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: {
          title: dto.title,
          description: dto.description,
          kind: dto.kind,
          discountMode: dto.discountMode,
          discountValue: toMoney(dto.discountValue),
          validFrom: day(dto.validFrom),
          validTo: day(dto.validTo),
          maxSeats: dto.kind === 'BUNDLE' ? (dto.maxSeats ?? null) : null,
          isPublic: dto.isPublic ?? true,
          coverImageUrl: dto.coverImageUrl,
          terms: dto.terms,
        },
      });
      if (dto.kind === 'BUNDLE')
        await this.writeLines(
          tx,
          user,
          offer.id,
          dto.lines ?? [],
          dto.discountMode,
          dto.discountValue,
        );
      else
        await this.writeTargets(
          tx,
          offer.id,
          dto.tripIds ?? [],
          dto.programIds ?? [],
        );
      await this.audit.log(
        user,
        {
          action: 'offer.created',
          entityType: 'offer',
          entityId: offer.id,
          summary: `${dto.kind === 'BUNDLE' ? 'Bundle' : 'Discount'} offer "${offer.title}" created`,
          changes: { after: dto },
        },
        tx,
      );
      return offer;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateOfferDto) {
    const before = await this.prisma.offer.findUnique({
      where: { id },
      include,
    });
    if (!before) throw new NotFoundException('Offer not found');
    const merged = {
      discountMode: dto.discountMode ?? before.discountMode,
      discountValue: dto.discountValue ?? before.discountValue.toString(),
      validFrom: dto.validFrom ?? before.validFrom.toISOString().slice(0, 10),
      validTo: dto.validTo ?? before.validTo.toISOString().slice(0, 10),
      lines: dto.lines,
      tripIds:
        dto.tripIds ??
        before.targets.filter((t) => t.tripId).map((t) => t.tripId!),
      programIds:
        dto.programIds ??
        before.targets.filter((t) => t.programId).map((t) => t.programId!),
      maxSeats: dto.maxSeats,
    };
    this.validateBase(before.kind, {
      ...merged,
      lines:
        dto.lines ??
        before.lines.map((l) => ({ companyItemId: l.companyItemId })),
    });
    if (
      before.kind === 'BUNDLE' &&
      dto.maxSeats !== undefined &&
      dto.maxSeats < before.confirmedSeats
    )
      throw new ConflictException(
        `${before.confirmedSeats} seats are already confirmed`,
      );
    if (before.kind === 'BUNDLE' && dto.lines && before._count.bookings)
      throw new ConflictException(
        'This bundle has bookings; its services can no longer change',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          discountMode: dto.discountMode,
          discountValue: dto.discountValue
            ? toMoney(dto.discountValue)
            : undefined,
          validFrom: dto.validFrom ? day(dto.validFrom) : undefined,
          validTo: dto.validTo ? day(dto.validTo) : undefined,
          maxSeats: before.kind === 'BUNDLE' ? dto.maxSeats : undefined,
          isPublic: dto.isPublic,
          coverImageUrl: dto.coverImageUrl,
          terms: dto.terms,
        },
      });
      if (before.kind === 'BUNDLE') {
        if (dto.lines)
          await this.writeLines(
            tx,
            user,
            id,
            dto.lines,
            merged.discountMode,
            merged.discountValue,
          );
        else
          await this.reprice(tx, id, merged.discountMode, merged.discountValue);
      } else if (dto.tripIds || dto.programIds) {
        await tx.offerTarget.deleteMany({ where: { offerId: id } });
        await this.writeTargets(tx, id, merged.tripIds, merged.programIds);
      }
      await this.audit.log(
        user,
        {
          action: 'offer.updated',
          entityType: 'offer',
          entityId: id,
          summary: `Offer "${before.title}" updated`,
          changes: diff(before as never, dto as never),
        },
        tx,
      );
      return tx.offer.findUniqueOrThrow({ where: { id } });
    });
  }

  async setActive(user: AuthUser, id: string, isActive: boolean) {
    const o = await this.prisma.offer.update({
      where: { id },
      data: { isActive },
    });
    await this.audit.log(user, {
      action: isActive ? 'offer.activated' : 'offer.deactivated',
      entityType: 'offer',
      entityId: id,
      summary: `Offer "${o.title}" ${isActive ? 'activated' : 'deactivated'}`,
    });
    return o;
  }

  /** Offers on a trip/program (for booking and public pages). */
  discountsFor(target: { tripId?: string; programId?: string }) {
    return this.prisma.offer.findMany({
      where: { kind: 'DISCOUNT', isActive: true, targets: { some: target } },
    });
  }

  // ------------------------------------------------------------------ internals

  private validateBase(
    kind: 'BUNDLE' | 'DISCOUNT',
    dto: {
      validFrom: string;
      validTo: string;
      discountMode: string;
      discountValue: string;
      lines?: OfferLineDto[] | { companyItemId: string }[];
      tripIds?: string[];
      programIds?: string[];
    },
  ) {
    const errors: string[] = [];
    if (dto.validTo < dto.validFrom)
      errors.push('The offer ends before it starts');
    if (dto.discountMode === 'PERCENT' && Number(dto.discountValue) > 100)
      errors.push('A percentage discount cannot exceed 100%');
    if (kind === 'BUNDLE') {
      if (!dto.lines || dto.lines.length < 2)
        errors.push('A bundle offer includes at least two services (OFR-02)');
      if (dto.tripIds?.length || dto.programIds?.length)
        errors.push('A bundle has services, not target trips');
    } else {
      if (!(dto.tripIds?.length || dto.programIds?.length))
        errors.push(
          'A discount offer targets at least one trip or program (OFR-02)',
        );
      if (dto.lines?.length)
        errors.push('A discount offer has targets, not services');
    }
    if (errors.length) throw new BadRequestException(errors);
  }

  private async writeLines(
    tx: Tx,
    user: AuthUser,
    offerId: string,
    lines: OfferLineDto[],
    mode: 'PERCENT' | 'FIXED',
    value: string,
  ) {
    const items = await tx.companyItem.findMany({
      where: {
        id: { in: lines.map((l) => l.companyItemId) },
        isActive: true,
        company: { isActive: true },
      },
      include: { company: { include: { service: true } } },
    });
    if (items.length !== new Set(lines.map((l) => l.companyItemId)).size)
      throw new NotFoundException(
        'A service item was not found or is deactivated',
      );
    const byId = new Map(items.map((i) => [i.id, i]));
    if (new Set(items.map((i) => i.currencyCode)).size > 1)
      throw new BadRequestException(
        'All services of a bundle must use the same currency',
      );
    if (distinctCoreServices(items.map((i) => i.company.service.kind)) < 2)
      throw new BadRequestException(
        'A bundle needs at least two different services (OFR-02)',
      );
    await tx.offerServiceLine.deleteMany({ where: { offerId } });
    for (const [i, l] of lines.entries()) {
      const item = byId.get(l.companyItemId)!;
      const profit =
        l.profitMode && l.profitValue !== undefined
          ? { mode: l.profitMode, value: l.profitValue }
          : await this.suppliers.defaultProfit(
              tx,
              item.company.serviceId,
              item.companyId,
            );
      await tx.offerServiceLine.create({
        data: {
          offerId,
          companyItemId: item.id,
          serviceId: item.company.serviceId,
          sequenceNo: i + 1,
          unitCost: toMoney(item.costPerPerson),
          quantity:
            item.company.service.kind === 'TRANSPORT' ? 1 : (l.quantity ?? 1),
          costSnapshot: lineCost(
            item.costPerPerson,
            item.company.service.kind === 'TRANSPORT' ? 1 : (l.quantity ?? 1),
          ).toFixed(2),
          profitMode: profit.mode,
          profitValue: toMoney(profit.value),
          sellingPrice: sellingPrice(
            lineCost(
              item.costPerPerson,
              item.company.service.kind === 'TRANSPORT' ? 1 : (l.quantity ?? 1),
            ),
            profit.mode,
            profit.value,
          ).toFixed(2),
        },
      });
    }
    await tx.offer.update({
      where: { id: offerId },
      data: { currencyCode: items[0].currencyCode },
    });
    void user;
    await this.reprice(tx, offerId, mode, value);
  }

  private async reprice(
    tx: Tx,
    offerId: string,
    mode: 'PERCENT' | 'FIXED',
    value: string,
  ) {
    const lines = await tx.offerServiceLine.findMany({ where: { offerId } });
    const totals = bundleTotals(lines, mode, value);
    await tx.offer.update({
      where: { id: offerId },
      data: {
        costPerPerson: totals.costPerPerson,
        pricePerPerson: totals.pricePerPerson,
      },
    });
  }

  private async writeTargets(
    tx: Tx,
    offerId: string,
    tripIds: string[],
    programIds: string[],
  ) {
    const [trips, programs] = await Promise.all([
      tx.trip.count({
        where: {
          id: { in: tripIds },
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
      }),
      tx.program.count({
        where: {
          id: { in: programIds },
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
      }),
    ]);
    if (trips !== tripIds.length || programs !== programIds.length)
      throw new NotFoundException(
        'A target trip or program was not found, or is already over',
      );
    await tx.offerTarget.createMany({
      data: [
        ...tripIds.map((tripId) => ({ offerId, tripId })),
        ...programIds.map((programId) => ({ offerId, programId })),
      ],
    });
  }
}
