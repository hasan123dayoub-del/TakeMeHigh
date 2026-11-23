import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit-logs/audit.service';
import type { AuthUser } from '../common/auth.types';
import { ilike, pageArgs, paginate } from '../common/dto/pagination.dto';
import { branchOwned } from '../common/scope';
import { toMoney } from '../common/utils/money';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateVisaDto, VisaQueryDto } from './bookings.dto';

export const visaInclude = {
  country: { select: { id: true, nameAr: true, nameEn: true } },
  passenger: {
    select: {
      id: true,
      customer: { select: { id: true, fullName: true, phone: true } },
      document: { select: { docType: true, docNumber: true, expiresOn: true } },
      booking: {
        select: {
          id: true,
          bookingNo: true,
          status: true,
          branchId: true,
          trip: { select: { id: true, code: true, title: true, startsAt: true } },
          program: { select: { id: true, code: true, title: true, legs: { select: { trip: { select: { startsAt: true } } }, orderBy: { sequenceNo: 'asc' }, take: 1 } } },
          offer: { select: { id: true, title: true, validFrom: true } },
        },
      },
    },
  },
} satisfies Prisma.VisaApplicationInclude;

/** VIS-01..04: the office arranges a visa for every passenger travelling abroad. */
@Injectable()
export class VisasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, q: VisaQueryDto) {
    const settings = await this.prisma.siteSetting.findUnique({ where: { id: 1 } });
    const horizon = new Date(Date.now() + (settings?.visaWarningDays ?? 14) * 86_400_000);
    const where: Prisma.VisaApplicationWhereInput = {
      AND: [
        { passenger: { booking: { status: { not: 'CANCELLED' }, ...branchOwned(user, q.branchId) } } },
        q.status ? { status: q.status } : {},
        q.tripId ? { passenger: { booking: { tripId: q.tripId } } } : {},
        q.programId ? { passenger: { booking: { programId: q.programId } } } : {},
        q.dueSoon
          ? {
              status: { not: 'APPROVED' },
              passenger: {
                booking: {
                  OR: [
                    { trip: { startsAt: { lte: horizon, gte: new Date() } } },
                    { program: { legs: { some: { sequenceNo: 1, trip: { startsAt: { lte: horizon, gte: new Date() } } } } } },
                  ],
                },
              },
            }
          : {},
        q.search ? { OR: [{ passenger: { customer: { fullName: ilike(q.search) } } }, { passenger: { booking: { bookingNo: ilike(q.search) } } }, { visaNumber: ilike(q.search) }] } : {},
      ],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.visaApplication.findMany({ where, include: visaInclude, orderBy: { createdAt: q.order }, ...pageArgs(q) }),
      this.prisma.visaApplication.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  /** VIS-02: on approval with a number, the visa is also stored among the customer's documents. */
  async update(user: AuthUser, id: string, dto: UpdateVisaDto) {
    const visa = await this.prisma.visaApplication.findFirst({ where: { id, passenger: { booking: branchOwned(user) } }, include: visaInclude });
    if (!visa) throw new NotFoundException('Visa record not found');
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.visaApplication.update({
        where: { id },
        data: {
          status: dto.status,
          visaNumber: dto.visaNumber,
          expiresOn: dto.expiresOn ? new Date(dto.expiresOn) : undefined,
          fee: dto.fee !== undefined ? toMoney(dto.fee) : undefined,
          notes: dto.notes,
          submittedAt: dto.status === 'SUBMITTED' && !visa.submittedAt ? now : undefined,
          decidedAt: dto.status === 'APPROVED' || dto.status === 'REJECTED' ? now : undefined,
        },
        include: visaInclude,
      });
      if (updated.status === 'APPROVED' && updated.visaNumber) {
        await tx.customerDocument.upsert({
          where: { docType_docNumber_issuingCountryId: { docType: 'VISA', docNumber: updated.visaNumber.toUpperCase(), issuingCountryId: updated.country.id } },
          create: { customerId: updated.passenger.customer.id, docType: 'VISA', docNumber: updated.visaNumber.toUpperCase(), issuingCountryId: updated.country.id, expiresOn: updated.expiresOn },
          update: { expiresOn: updated.expiresOn },
        });
      }
      await this.audit.log(user, {
        action: 'visa.updated',
        entityType: 'visa',
        entityId: id,
        summary: `Visa of ${visa.passenger.customer.fullName} for ${visa.country.nameEn}: ${updated.status}`,
        changes: { before: { status: visa.status }, after: dto },
      }, tx);
      return updated;
    });
  }
}
