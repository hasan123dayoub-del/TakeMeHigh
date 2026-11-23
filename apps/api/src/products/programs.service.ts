import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import {
  assertCanEditProduct,
  isAll,
  productBranchFor,
  programVisibility,
} from '../common/scope';
import { programCode } from '../common/utils/codes';
import { D } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LifecycleService } from './lifecycle.service';
import type {
  CreateProgramDto,
  DecisionDto,
  ProgramQueryDto,
  UpdateProgramDto,
} from './products.dto';
import { distinctCoreServices, programErrors, programTotals } from './rules';

const legTrip = {
  select: {
    id: true,
    code: true,
    title: true,
    status: true,
    scope: true,
    branchId: true,
    startsAt: true,
    endsAt: true,
    registrationDeadline: true,
    currencyCode: true,
    maxPassengers: true,
    confirmedSeats: true,
    pricePerPerson: true,
    costPerPerson: true,
    originCityId: true,
    destinationCityId: true,
    originCity: { select: { id: true, nameAr: true, nameEn: true } },
    destinationCity: { select: { id: true, nameAr: true, nameEn: true } },
    pickupPoints: {
      include: { city: { select: { id: true, nameAr: true, nameEn: true } } },
    },
    lines: {
      select: {
        service: { select: { kind: true, nameAr: true } },
        transportMode: true,
      },
    },
  },
} as const;

const include = {
  category: { select: { id: true, nameAr: true, nameEn: true } },
  branch: { select: { id: true, name: true } },
  currency: true,
  legs: { include: { trip: legTrip }, orderBy: { sequenceNo: 'asc' } },
  _count: { select: { bookings: { where: { status: { not: 'CANCELLED' } } } } },
} satisfies Prisma.ProgramInclude;

type ProgramRow = Prisma.ProgramGetPayload<{ include: typeof include }>;

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lifecycle: LifecycleService,
  ) {}

  /** PGM-04: seats = min(program capacity, remaining seats of every leg). */
  availableSeats(p: {
    maxPassengers: number;
    confirmedSeats: number;
    legs: { trip: { maxPassengers: number; confirmedSeats: number } }[];
  }) {
    return Math.max(
      0,
      Math.min(
        p.maxPassengers - p.confirmedSeats,
        ...p.legs.map((l) => l.trip.maxPassengers - l.trip.confirmedSeats),
      ),
    );
  }

  private shape(user: AuthUser, p: ProgramRow) {
    const breakdown = user.permissions.includes('pricing.view_breakdown');
    return {
      ...p,
      costPerPerson: breakdown ? p.costPerPerson : undefined,
      availableSeats: this.availableSeats(p),
      startsAt: p.legs[0]?.trip.startsAt ?? null,
      endsAt: p.legs.at(-1)?.trip.endsAt ?? null,
      legs: p.legs.map((l) => ({
        ...l,
        trip: {
          ...l.trip,
          costPerPerson: breakdown ? l.trip.costPerPerson : undefined,
        },
      })),
      services: [
        ...new Set(
          p.legs.flatMap((l) => l.trip.lines.map((x) => x.service.kind)),
        ),
      ],
    };
  }

  async list(user: AuthUser, q: ProgramQueryDto) {
    await this.lifecycle.runDue();
    const where: Prisma.ProgramWhereInput = {
      AND: [
        programVisibility(user, q.branchId),
        q.status ? { status: q.status } : {},
        q.categoryId ? { categoryId: q.categoryId } : {},
        q.scope ? { scope: q.scope } : {},
        q.tripId ? { legs: { some: { tripId: q.tripId } } } : {},
        q.bookable
          ? { status: 'OPEN', registrationDeadline: { gt: new Date() } }
          : {},
        q.search
          ? { OR: [{ title: ilike(q.search) }, { code: ilike(q.search) }] }
          : {},
      ],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.program.findMany({
        where,
        include,
        orderBy: orderArgs(
          q,
          [
            'createdAt',
            'title',
            'registrationDeadline',
            'pricePerPerson',
          ] as const,
          'createdAt',
        ),
        ...pageArgs(q),
      }),
      this.prisma.program.count({ where }),
    ]);
    return paginate(
      rows.map((p) => this.shape(user, p)),
      total,
      q,
    );
  }

  async get(user: AuthUser, id: string) {
    await this.lifecycle.runDue();
    const p = await this.prisma.program.findFirst({
      where: { AND: [{ id }, programVisibility(user)] },
      include: {
        ...include,
        decisions: {
          include: { decidedBy: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        offerTargets: { include: { offer: true } },
      },
    });
    if (!p) throw new NotFoundException('Program not found');
    return this.shape(user, p);
  }

  async create(user: AuthUser, dto: CreateProgramDto) {
    const branchId = productBranchFor(user, dto.branchId);
    const legs = await this.validate(
      user,
      dto.tripIds,
      dto.registrationDeadline,
      dto.minPassengers,
      dto.maxPassengers,
      branchId,
    );
    await this.assertCategory(dto.categoryId);
    return this.prisma.$transaction(async (tx) => {
      const program = await tx.program.create({
        data: {
          code: await programCode(tx),
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          branchId,
          scope: legs.some((l) => l.scope === 'INTERNATIONAL')
            ? 'INTERNATIONAL'
            : 'DOMESTIC',
          registrationDeadline: dto.registrationDeadline,
          minPassengers: dto.minPassengers,
          maxPassengers: dto.maxPassengers,
          currencyCode: legs[0].currencyCode,
          isPublic: dto.isPublic ?? false,
          coverImageUrl: dto.coverImageUrl,
          terms: dto.terms,
          ...programTotals(legs),
          legs: {
            create: dto.tripIds.map((tripId, i) => ({
              tripId,
              sequenceNo: i + 1,
            })),
          },
        },
      });
      await this.audit.log(
        user,
        {
          action: 'program.created',
          entityType: 'program',
          entityId: program.id,
          summary: `Program ${program.code} "${program.title}" created with ${legs.length} trips`,
          changes: { after: dto },
        },
        tx,
      );
      return program;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateProgramDto) {
    const p = await this.editable(user, id);
    if (dto.branchId !== undefined && !isAll(user))
      throw new ForbiddenException(
        'Only the Admin can move a program to another branch',
      );
    const structural =
      dto.tripIds !== undefined ||
      dto.registrationDeadline !== undefined ||
      dto.maxPassengers !== undefined ||
      dto.minPassengers !== undefined;
    if (dto.tripIds) {
      if (!['DRAFT', 'OPEN'].includes(p.status))
        throw new ConflictException(
          'The trips of a closed program cannot change',
        );
      if (p._count.bookings && !isAll(user))
        throw new ForbiddenException(
          'This program has bookings; only the Admin can change its trips (PGM-08)',
        );
      if (p._count.bookings) {
        const confirmed = await this.prisma.booking.count({
          where: { programId: id, status: 'CONFIRMED' },
        });
        if (confirmed)
          throw new ConflictException(
            'Confirmed passengers hold seats on the current trips; cancel or move those bookings first',
          );
      }
    }
    if (dto.maxPassengers !== undefined && dto.maxPassengers < p.confirmedSeats)
      throw new ConflictException(
        `${p.confirmedSeats} seats are already confirmed`,
      );
    const tripIds = dto.tripIds ?? p.legs.map((l) => l.tripId);
    const legs = structural
      ? await this.validate(
          user,
          tripIds,
          dto.registrationDeadline ?? p.registrationDeadline,
          dto.minPassengers ?? p.minPassengers,
          dto.maxPassengers ?? p.maxPassengers,
          dto.branchId ?? p.branchId,
        )
      : null;
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.tripIds) {
        await tx.programTrip.deleteMany({ where: { programId: id } });
        await tx.programTrip.createMany({
          data: dto.tripIds.map((tripId, i) => ({
            programId: id,
            tripId,
            sequenceNo: i + 1,
          })),
        });
      }
      const { tripIds: _ignored, ...rest } = dto;
      void _ignored;
      const updated = await tx.program.update({
        where: { id },
        data: {
          ...rest,
          ...(legs
            ? {
                ...programTotals(legs),
                currencyCode: legs[0].currencyCode,
                scope: legs.some((l) => l.scope === 'INTERNATIONAL')
                  ? 'INTERNATIONAL'
                  : 'DOMESTIC',
              }
            : {}),
        },
      });
      await this.audit.log(
        user,
        {
          action: 'program.updated',
          entityType: 'program',
          entityId: id,
          summary: `Program ${p.code} updated`,
          changes: diff(
            { ...p, tripIds: p.legs.map((l) => l.tripId) } as never,
            dto as never,
          ),
        },
        tx,
      );
      return updated;
    });
  }

  /** Every leg must be open (bookable) and the program valid. */
  async publish(user: AuthUser, id: string) {
    const p = await this.editable(user, id);
    if (p.status !== 'DRAFT')
      throw new ConflictException(
        `Only a draft can be published (now ${p.status})`,
      );
    const legs = await this.validate(
      user,
      p.legs.map((l) => l.tripId),
      p.registrationDeadline,
      p.minPassengers,
      p.maxPassengers,
      p.branchId,
    );
    const errors: string[] = [];
    for (const l of legs)
      if (l.status !== 'OPEN')
        errors.push(`${l.code} must be published (open) first`);
    if (p.registrationDeadline <= new Date())
      errors.push('The registration deadline is already in the past');
    if (D(p.pricePerPerson).lte(0)) errors.push('The program has no price yet');
    if (errors.length) throw new BadRequestException(errors);
    const updated = await this.prisma.program.update({
      where: { id },
      data: { status: 'OPEN' },
    });
    await this.audit.log(user, {
      action: 'program.published',
      entityType: 'program',
      entityId: id,
      summary: `${p.code} published at ${p.pricePerPerson.toString()} ${p.currencyCode}`,
    });
    return updated;
  }

  async setPublic(user: AuthUser, id: string, isPublic: boolean) {
    const p = await this.editable(user, id);
    const updated = await this.prisma.program.update({
      where: { id },
      data: { isPublic },
    });
    await this.audit.log(user, {
      action: isPublic ? 'program.made_public' : 'program.made_private',
      entityType: 'program',
      entityId: id,
      summary: `${p.code} ${isPublic ? 'shown on' : 'hidden from'} the public page`,
    });
    return updated;
  }

  close(user: AuthUser, id: string) {
    return this.lifecycle.closeProgram(user, id);
  }
  decide(user: AuthUser, id: string, dto: DecisionDto) {
    return this.lifecycle.decideProgram(user, id, dto);
  }
  cancel(user: AuthUser, id: string, reason: string) {
    return this.lifecycle.cancelProgram(user, id, reason);
  }

  /** Passengers of the program (PGM-09). */
  async passengers(user: AuthUser, id: string) {
    const p = await this.get(user, id);
    const rows = await this.prisma.bookingPassenger.findMany({
      where: { booking: { programId: id, status: { not: 'CANCELLED' } } },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            nationality: { select: { nameAr: true } },
          },
        },
        document: {
          select: { docType: true, docNumber: true, expiresOn: true },
        },
        booking: {
          select: {
            id: true,
            bookingNo: true,
            status: true,
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: [{ booking: { bookingNo: 'asc' } }, { sortOrder: 'asc' }],
    });
    return {
      program: { id: p.id, code: p.code, title: p.title },
      total: rows.length,
      passengers: rows,
    };
  }

  // ------------------------------------------------------------------ internals

  private async validate(
    user: AuthUser,
    tripIds: string[],
    deadline: Date,
    min: number,
    max: number,
    branchId: string | null,
  ) {
    if (max < min)
      throw new BadRequestException(
        'Maximum passengers must be at least the minimum',
      );
    const trips = await this.prisma.trip.findMany({
      where: { id: { in: tripIds } },
      include: { lines: { select: { service: { select: { kind: true } } } } },
    });
    const byId = new Map(trips.map((t) => [t.id, t]));
    const legs = tripIds
      .map((tid) => byId.get(tid))
      .filter((t): t is NonNullable<typeof t> => !!t);
    if (legs.length !== tripIds.length)
      throw new NotFoundException('One of the trips was not found');
    for (const t of legs) {
      // A program may only use trips its branch can see: its own or shared ones.
      if (t.branchId && branchId && t.branchId !== branchId)
        throw new BadRequestException(`${t.code} belongs to another branch`);
      if (t.branchId && !branchId)
        throw new BadRequestException(
          `${t.code} belongs to one branch; a shared program can only use shared trips`,
        );
    }
    const errors = programErrors(legs, deadline);
    if (
      distinctCoreServices(
        legs.flatMap((t) => t.lines.map((l) => l.service.kind)),
      ) < 2
    )
      errors.push(
        'A program needs at least two different services out of hotel, transport and restaurant (BR-04)',
      );
    if (deadline > legs[0].startsAt)
      errors.push(
        'The registration deadline must be before the first trip starts',
      );
    if (errors.length) throw new BadRequestException(errors);
    void user;
    return legs;
  }

  private async editable(user: AuthUser, id: string) {
    const p = await this.prisma.program.findFirst({
      where: { AND: [{ id }, programVisibility(user)] },
      include,
    });
    if (!p) throw new NotFoundException('Program not found');
    assertCanEditProduct(user, p);
    if (p.status === 'CANCELLED' || p.status === 'COMPLETED')
      throw new ConflictException(
        `The program is ${p.status.toLowerCase()} and can no longer change`,
      );
    return p;
  }

  private async assertCategory(id: string) {
    if (
      !(await this.prisma.tripCategory.findFirst({
        where: { id, isActive: true },
      }))
    )
      throw new NotFoundException('Category not found or disabled');
  }
}
