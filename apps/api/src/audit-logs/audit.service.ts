import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/auth.types';
import { Prisma } from '../generated/prisma/client';
import { PrismaService, Tx } from '../prisma/prisma.service';

export interface AuditInput {
  /** e.g. trip.closed, payment.refunded, role.permissions_changed */
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  /** { before, after } for updates, or any small context object */
  changes?: unknown;
  ip?: string;
}

/** Fields never written to the audit trail. */
const SECRET_KEYS = new Set(['passwordHash', 'password', 'credentials', 'credentialsEncrypted', 'tokenHash']);

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !SECRET_KEYS.has(k))
        .map(([k, v]) => [k, scrub(v)]),
    );
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

/** Only the fields that actually changed, for compact { before, after } records. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    const prev = before[key];
    const next = after[key];
    const same = String(prev instanceof Date ? prev.toISOString() : prev) === String(next instanceof Date ? next.toISOString() : next);
    if (next !== undefined && !same) {
      b[key] = prev;
      a[key] = next;
    }
  }
  return { before: b, after: a };
}

/**
 * Append-only audit trail (AUD-01, AUD-02: a database trigger rejects UPDATE/DELETE).
 * Pass the transaction client so the entry commits (or rolls back) with the change itself.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(user: AuthUser | null, input: AuditInput, tx?: Tx) {
    const db = tx ?? this.prisma;
    await db.auditLog.create({
      data: {
        userId: user?.userId ?? null,
        branchId: user?.branchId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 255),
        changes: input.changes === undefined ? undefined : (JSON.parse(JSON.stringify(scrub(input.changes))) as Prisma.InputJsonValue),
        ip: input.ip?.slice(0, 64),
      },
    });
  }
}
