import { NotFoundException } from '@nestjs/common';
import type { EntityManager, EntityTarget, FindOptionsRelations, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

type Tenant = ObjectLiteral & { id: string; agencyId: string };

/**
 * Load a row by id *inside the caller's agency*. A row owned by another agency is reported as
 * "not found" (never "forbidden") so ids from other tenants cannot even be probed.
 */
export async function findOwned<T extends Tenant>(
  repo: Repository<T>,
  id: string,
  agencyId: string,
  relations?: FindOptionsRelations<T>,
  label = 'Record',
): Promise<T> {
  const row = await repo.findOne({ where: { id, agencyId } as FindOptionsWhere<T>, relations });
  if (!row) throw new NotFoundException(`${label} not found`);
  return row;
}

/** Same as findOwned but takes a row lock (SELECT ... FOR UPDATE) inside a transaction. */
export async function lockOwned<T extends Tenant>(
  m: EntityManager,
  entity: EntityTarget<T>,
  id: string,
  agencyId: string,
  label = 'Record',
): Promise<T> {
  const row = await m.findOne(entity, {
    where: { id, agencyId } as FindOptionsWhere<T>,
    lock: { mode: 'pessimistic_write' },
  });
  if (!row) throw new NotFoundException(`${label} not found`);
  return row;
}
