import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';

export interface ActivityInput {
  agencyId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityService {
  constructor(@InjectRepository(ActivityLog) private readonly logs: Repository<ActivityLog>) {}

  /** Pass the transaction manager so the audit row commits or rolls back with the change it describes. */
  async log(input: ActivityInput, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(ActivityLog) : this.logs;
    await repo.save(
      repo.create({
      agencyId: input.agencyId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary.slice(0, 255),
      metadata: input.metadata ?? null,
      }),
    );
  }

  recent(agencyId: string, limit = 10) {
    return this.logs.find({
      where: { agencyId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        summary: true,
        createdAt: true,
        user: { id: true, fullName: true },
      },
    });
  }
}
