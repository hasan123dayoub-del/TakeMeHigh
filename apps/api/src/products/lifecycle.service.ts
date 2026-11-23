import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import {
  assertCanEditProduct,
  productVisibility,
  programVisibility,
} from '../common/scope';
import { PrismaService, Tx } from '../prisma/prisma.service';
import type { DecisionDto } from './products.dto';
import { assertTransition, programTotals } from './rules';

/**
 * Registration closing and decisions for trips and programs (CLS-01..05, SRS B.5).
 * The scheduler closes expired registrations every minute; reads also call runDue() so a list
 * never shows an expired registration as open between two scheduler ticks.
 */
@Injectable()
export class LifecycleService {
  private readonly logger = new Logger('Lifecycle');
  private lastRun = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'registration-deadlines',
    disabled: process.env.DISABLE_SCHEDULER === 'true',
  })
  async tick() {
    await this.runDue(true);
  }

  /** CLS-02 (auto-close at the deadline) and B.5 (COMPLETED after the end date). Throttled to every 20 s. */
  async runDue(force = false) {
    if (!force && Date.now() - this.lastRun < 20_000) return;
    this.lastRun = Date.now();
    const now = new Date();
    try {
      const trips = await this.prisma.trip.findMany({
        where: { status: 'OPEN', registrationDeadline: { lte: now } },
        select: { id: true, code: true },
      });
      for (const t of trips)
        await this.prisma.$transaction((tx) =>
          this.closeTripTx(tx, null, t.id, 'DEADLINE'),
        );
      const programs = await this.prisma.program.findMany({
        where: { status: 'OPEN', registrationDeadline: { lte: now } },
        select: { id: true },
      });
      for (const p of programs)
        await this.prisma.$transaction((tx) =>
          this.closeProgramTx(tx, null, p.id, 'DEADLINE'),
        );

      const finished = await this.prisma.trip.updateMany({
        where: { status: 'CONFIRMED', endsAt: { lt: now } },
        data: { status: 'COMPLETED' },
      });
      const donePrograms = await this.prisma.program.findMany({
        where: {
          status: 'CONFIRMED',
          legs: { every: { trip: { endsAt: { lt: now } } } },
        },
        select: { id: true },
      });
      if (donePrograms.length)
        await this.prisma.program.updateMany({
          where: { id: { in: donePrograms.map((p) => p.id) } },
          data: { status: 'COMPLETED' },
        });
      if (
        trips.length ||
        programs.length ||
        finished.count ||
        donePrograms.length
      )
        this.logger.log(
          `closed ${trips.length} trip(s), ${programs.length} program(s); completed ${finished.count} trip(s), ${donePrograms.length} program(s)`,
        );
    } catch (e) {
      this.logger.error((e as Error).message);
    }
  }

  // ------------------------------------------------------------------ trips

  /** CLS-03: manual close before the deadline, same effect as the automatic one. */
  async closeTrip(user: AuthUser, id: string) {
    await this.editableTrip(user, id);
    return this.prisma.$transaction((tx) =>
      this.closeTripTx(tx, user, id, 'MANUAL'),
    );
  }

  private async closeTripTx(
    tx: Tx,
    user: AuthUser | null,
    id: string,
    reason: 'DEADLINE' | 'MANUAL',
  ) {
    const trip = await tx.trip.findUniqueOrThrow({ where: { id } });
    if (trip.status !== 'OPEN')
      throw new ConflictException(`Registration is not open (${trip.status})`);
    const updated = await tx.trip.update({
      where: { id, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closureReason: reason,
        finalPassengerCount: trip.confirmedSeats,
      },
    });
    await this.audit.log(
      user,
      {
        action: 'trip.closed',
        entityType: 'trip',
        entityId: id,
        summary: `${trip.code}: registration closed (${reason === 'DEADLINE' ? 'deadline' : 'manual'}) with ${trip.confirmedSeats} passenger(s)${trip.confirmedSeats < trip.minPassengers ? `, below the minimum of ${trip.minPassengers}` : ''}`,
        changes: {
          after: {
            finalPassengerCount: trip.confirmedSeats,
            closureReason: reason,
          },
        },
      },
      tx,
    );
    return updated;
  }

  /** CLS-05: confirm, extend, reopen or cancel after closing. */
  async decideTrip(user: AuthUser, id: string, dto: DecisionDto) {
    const trip = await this.editableTrip(user, id);
    if (dto.decision === 'CANCEL')
      return this.cancelTrip(
        user,
        id,
        dto.note ?? 'Cancelled after registration closed',
      );
    if (dto.decision === 'REOPEN' && !user.permissions.includes('trips.cancel'))
      throw new ForbiddenException('Only the Admin reopens a registration');
    if (trip.status !== 'CLOSED')
      throw new ConflictException(
        'A decision is taken after registration closes',
      );
    if (dto.decision === 'CONFIRM') {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.trip.update({
          where: { id },
          data: { status: 'CONFIRMED' },
        });
        await tx.registrationDecision.create({
          data: {
            tripId: id,
            decision: 'CONFIRM',
            passengersAtTime: trip.confirmedSeats,
            previousDeadline: trip.registrationDeadline,
            note: dto.note,
            decidedById: user.userId,
          },
        });
        await this.audit.log(
          user,
          {
            action: 'trip.confirmed',
            entityType: 'trip',
            entityId: id,
            summary: `${trip.code} confirmed with ${trip.confirmedSeats} passenger(s)`,
          },
          tx,
        );
        return updated;
      });
    }
    // EXTEND / REOPEN
    if (!dto.newDeadline)
      throw new BadRequestException('Give the new registration deadline');
    if (dto.newDeadline <= new Date() || dto.newDeadline > trip.startsAt)
      throw new BadRequestException(
        'The new deadline must be in the future and before the trip starts',
      );
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: 'OPEN',
          registrationDeadline: dto.newDeadline,
          closedAt: null,
          closureReason: null,
          finalPassengerCount: null,
        },
      });
      await tx.registrationDecision.create({
        data: {
          tripId: id,
          decision: dto.decision,
          passengersAtTime: trip.confirmedSeats,
          previousDeadline: trip.registrationDeadline,
          newDeadline: dto.newDeadline,
          note: dto.note,
          decidedById: user.userId,
        },
      });
      await this.audit.log(
        user,
        {
          action: dto.decision === 'EXTEND' ? 'trip.extended' : 'trip.reopened',
          entityType: 'trip',
          entityId: id,
          summary: `${trip.code}: registration reopened until ${dto.newDeadline!.toISOString().slice(0, 16)}`,
        },
        tx,
      );
      return updated;
    });
  }

  /** Cancels the trip and its bookings (refunds are recorded by the Admin, B.5). */
  async cancelTrip(user: AuthUser, id: string, reason: string) {
    if (!user.permissions.includes('trips.cancel'))
      throw new ForbiddenException('Only the Admin cancels a trip');
    const trip = await this.editableTrip(user, id);
    const err = assertTransition(trip.status, 'CANCELLED');
    if (err) throw new ConflictException(err);
    const activePrograms = await this.prisma.program.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
        legs: { some: { tripId: id } },
      },
      select: { code: true },
    });
    if (activePrograms.length)
      throw new ConflictException(
        `Cancel the program(s) ${activePrograms.map((p) => p.code).join(', ')} first; this trip is one of their legs`,
      );
    return this.prisma.$transaction(async (tx) => {
      const cancelled = await this.cancelBookings(
        tx,
        user,
        { tripId: id },
        `Trip ${trip.code} cancelled: ${reason}`,
      );
      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          confirmedSeats: 0,
          isPublic: false,
        },
      });
      await tx.registrationDecision.create({
        data: {
          tripId: id,
          decision: 'CANCEL',
          passengersAtTime: trip.confirmedSeats,
          previousDeadline: trip.registrationDeadline,
          note: reason,
          decidedById: user.userId,
        },
      });
      await this.audit.log(
        user,
        {
          action: 'trip.cancelled',
          entityType: 'trip',
          entityId: id,
          summary: `${trip.code} cancelled (${cancelled} booking(s) cancelled): ${reason}`,
        },
        tx,
      );
      return updated;
    });
  }

  // ------------------------------------------------------------------ programs

  async closeProgram(user: AuthUser, id: string) {
    await this.editableProgram(user, id);
    return this.prisma.$transaction((tx) =>
      this.closeProgramTx(tx, user, id, 'MANUAL'),
    );
  }

  private async closeProgramTx(
    tx: Tx,
    user: AuthUser | null,
    id: string,
    reason: 'DEADLINE' | 'MANUAL',
  ) {
    const p = await tx.program.findUniqueOrThrow({ where: { id } });
    if (p.status !== 'OPEN')
      throw new ConflictException(`Registration is not open (${p.status})`);
    const updated = await tx.program.update({
      where: { id, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closureReason: reason,
        finalPassengerCount: p.confirmedSeats,
      },
    });
    await this.audit.log(
      user,
      {
        action: 'program.closed',
        entityType: 'program',
        entityId: id,
        summary: `${p.code}: registration closed (${reason.toLowerCase()}) with ${p.confirmedSeats} passenger(s)`,
        changes: {
          after: {
            finalPassengerCount: p.confirmedSeats,
            closureReason: reason,
          },
        },
      },
      tx,
    );
    return updated;
  }

  async decideProgram(user: AuthUser, id: string, dto: DecisionDto) {
    const p = await this.editableProgram(user, id);
    if (dto.decision === 'CANCEL')
      return this.cancelProgram(
        user,
        id,
        dto.note ?? 'Cancelled after registration closed',
      );
    if (dto.decision === 'REOPEN' && !user.permissions.includes('trips.cancel'))
      throw new ForbiddenException('Only the Admin reopens a registration');
    if (p.status !== 'CLOSED')
      throw new ConflictException(
        'A decision is taken after registration closes',
      );
    if (dto.decision === 'CONFIRM') {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.program.update({
          where: { id },
          data: { status: 'CONFIRMED' },
        });
        await tx.registrationDecision.create({
          data: {
            programId: id,
            decision: 'CONFIRM',
            passengersAtTime: p.confirmedSeats,
            previousDeadline: p.registrationDeadline,
            note: dto.note,
            decidedById: user.userId,
          },
        });
        await this.audit.log(
          user,
          {
            action: 'program.confirmed',
            entityType: 'program',
            entityId: id,
            summary: `${p.code} confirmed with ${p.confirmedSeats} passenger(s)`,
          },
          tx,
        );
        return updated;
      });
    }
    if (!dto.newDeadline)
      throw new BadRequestException('Give the new registration deadline');
    const legs = await this.prisma.programTrip.findMany({
      where: { programId: id },
      include: { trip: true },
    });
    const earliest = Math.min(
      ...legs.map((l) => l.trip.registrationDeadline.getTime()),
    );
    if (dto.newDeadline <= new Date() || dto.newDeadline.getTime() > earliest)
      throw new BadRequestException(
        'The new deadline must be in the future and not after any trip’s own deadline (PGM-05)',
      );
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.program.update({
        where: { id },
        data: {
          status: 'OPEN',
          registrationDeadline: dto.newDeadline,
          closedAt: null,
          closureReason: null,
          finalPassengerCount: null,
        },
      });
      await tx.registrationDecision.create({
        data: {
          programId: id,
          decision: dto.decision,
          passengersAtTime: p.confirmedSeats,
          previousDeadline: p.registrationDeadline,
          newDeadline: dto.newDeadline,
          note: dto.note,
          decidedById: user.userId,
        },
      });
      await this.audit.log(
        user,
        {
          action: 'program.reopened',
          entityType: 'program',
          entityId: id,
          summary: `${p.code}: registration reopened until ${dto.newDeadline!.toISOString().slice(0, 16)}`,
        },
        tx,
      );
      return updated;
    });
  }

  async cancelProgram(user: AuthUser, id: string, reason: string) {
    if (!user.permissions.includes('trips.cancel'))
      throw new ForbiddenException('Only the Admin cancels a program');
    const p = await this.editableProgram(user, id);
    const err = assertTransition(p.status, 'CANCELLED');
    if (err) throw new ConflictException(err);
    return this.prisma.$transaction(async (tx) => {
      const cancelled = await this.cancelBookings(
        tx,
        user,
        { programId: id },
        `Program ${p.code} cancelled: ${reason}`,
      );
      const updated = await tx.program.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          confirmedSeats: 0,
          isPublic: false,
        },
      });
      await tx.registrationDecision.create({
        data: {
          programId: id,
          decision: 'CANCEL',
          passengersAtTime: p.confirmedSeats,
          previousDeadline: p.registrationDeadline,
          note: reason,
          decidedById: user.userId,
        },
      });
      await this.audit.log(
        user,
        {
          action: 'program.cancelled',
          entityType: 'program',
          entityId: id,
          summary: `${p.code} cancelled (${cancelled} booking(s) cancelled): ${reason}`,
        },
        tx,
      );
      return updated;
    });
  }

  // ------------------------------------------------------------------ shared

  /** Cancels the active bookings of a trip or program and gives their seats back. */
  private async cancelBookings(
    tx: Tx,
    user: AuthUser,
    where: { tripId?: string; programId?: string },
    reason: string,
  ) {
    const bookings = await tx.booking.findMany({
      where: { ...where, status: { not: 'CANCELLED' } },
      select: { id: true, status: true, passengerCount: true, programId: true },
    });
    for (const b of bookings) {
      if (b.status === 'CONFIRMED' && b.programId) {
        const legs = await tx.programTrip.findMany({
          where: { programId: b.programId },
        });
        for (const l of legs)
          await tx.trip.update({
            where: { id: l.tripId },
            data: { confirmedSeats: { decrement: b.passengerCount } },
          });
      }
      await tx.booking.update({
        where: { id: b.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason.slice(0, 255),
        },
      });
      await tx.bookingEvent.create({
        data: {
          bookingId: b.id,
          type: 'CANCELLED',
          actorId: user.userId,
          data: { reason, previousStatus: b.status },
        },
      });
    }
    return bookings.length;
  }

  /** BR-06: program prices follow their trips. */
  async repriceProgramsOf(tx: Tx, tripId: string) {
    const programs = await tx.program.findMany({
      where: { legs: { some: { tripId } } },
      include: { legs: { include: { trip: true } } },
    });
    for (const p of programs)
      await tx.program.update({
        where: { id: p.id },
        data: programTotals(p.legs.map((l) => l.trip)),
      });
  }

  private async editableTrip(user: AuthUser, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { AND: [{ id }, productVisibility(user)] },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    assertCanEditProduct(user, trip);
    return trip;
  }

  private async editableProgram(user: AuthUser, id: string) {
    const p = await this.prisma.program.findFirst({
      where: { AND: [{ id }, programVisibility(user)] },
    });
    if (!p) throw new NotFoundException('Program not found');
    assertCanEditProduct(user, p);
    return p;
  }
}
