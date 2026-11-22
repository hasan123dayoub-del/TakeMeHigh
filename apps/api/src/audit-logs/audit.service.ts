import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/auth.types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';

export interface AuditInput {
  action: string; // e.g. booking.confirmed
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

/** Append-only audit trail. Pass the transaction client so the log commits with the change. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(user: AuthUser | null, input: AuditInput & { officeId?: string | null }, tx?: Tx) {
    const db = tx ?? this.prisma;
    await db.auditLog.create({
      data: {
        officeId: input.officeId ?? user?.officeId ?? null,
        branchId: user?.branchId ?? null,
        userId: user?.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 255),
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
