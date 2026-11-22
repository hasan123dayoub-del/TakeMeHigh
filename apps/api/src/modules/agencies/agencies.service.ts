import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth.types';
import { findOwned } from '../../common/utils/tenant';
import { ActivityService } from '../activity/activity.service';
import { User } from '../users/entities/user.entity';
import { CreateUserDto, UpdateAgencyDto, UpdateUserDto } from './agencies.dto';
import { AgencySettings } from './entities/agency-settings.entity';
import { Agency } from './entities/agency.entity';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency) private readonly agencies: Repository<Agency>,
    @InjectRepository(AgencySettings) private readonly settings: Repository<AgencySettings>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectDataSource() private readonly db: DataSource,
    private readonly activity: ActivityService,
  ) {}

  async get(agencyId: string) {
    const agency = await this.agencies.findOneByOrFail({ id: agencyId });
    const settings =
      (await this.settings.findOneBy({ agencyId })) ??
      (await this.settings.save(this.settings.create({ agencyId })));
    return { ...agency, settings };
  }

  async update(user: AuthUser, dto: UpdateAgencyDto) {
    const { settings, ...profile } = dto;
    await this.db.transaction(async (m) => {
      if (Object.keys(profile).length) {
        await m.update(Agency, { id: user.agencyId }, { ...profile, currency: profile.currency?.toUpperCase() });
      }
      if (settings && Object.keys(settings).length) {
        const exists = await m.findOneBy(AgencySettings, { agencyId: user.agencyId });
        if (exists) await m.update(AgencySettings, { agencyId: user.agencyId }, settings);
        else await m.save(m.create(AgencySettings, { ...settings, agencyId: user.agencyId }));
      }
      await this.activity.log(
        {
          agencyId: user.agencyId,
          userId: user.userId,
          action: 'agency.updated',
          entityType: 'agency',
          entityId: user.agencyId,
          summary: 'Updated agency profile and settings',
        },
        m,
      );
    });
    return this.get(user.agencyId);
  }

  listUsers(agencyId: string) {
    return this.users.find({ where: { agencyId }, order: { createdAt: 'ASC' } });
  }

  async createUser(actor: AuthUser, dto: CreateUserDto) {
    if (dto.role === 'OWNER' && actor.role !== 'OWNER') {
      throw new ForbiddenException('Only an owner can add another owner');
    }
    const email = dto.email.trim().toLowerCase();
    if (await this.users.existsBy({ email })) throw new ConflictException('This email is already registered');
    const user = await this.users.save(
      this.users.create({
        agencyId: actor.agencyId,
        fullName: dto.fullName,
        email,
        role: dto.role,
        phone: dto.phone ?? null,
        passwordHash: await bcrypt.hash(dto.password, 12),
      }),
    );
    await this.activity.log({
      agencyId: actor.agencyId,
      userId: actor.userId,
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      summary: `Added team member ${user.fullName} (${user.role.replace('_', ' ').toLowerCase()})`,
    });
    const { passwordHash: _hidden, ...safe } = user;
    return safe;
  }

  async updateUser(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const target = await findOwned(this.users, id, actor.agencyId, undefined, 'User');
    if (target.role === 'OWNER' && actor.role !== 'OWNER') throw new ForbiddenException('Only an owner can change an owner');
    if (dto.role === 'OWNER' && actor.role !== 'OWNER') throw new ForbiddenException('Only an owner can grant the owner role');
    if (id === actor.userId && (dto.isActive === false || (dto.role && dto.role !== target.role))) {
      throw new BadRequestException('You cannot deactivate yourself or change your own role');
    }
    // Never leave an agency without an active owner.
    if (target.role === 'OWNER' && (dto.isActive === false || (dto.role && dto.role !== 'OWNER'))) {
      const owners = await this.users.countBy({ agencyId: actor.agencyId, role: 'OWNER', isActive: true });
      if (owners <= 1) throw new ConflictException('The agency must keep at least one active owner');
    }
    Object.assign(target, dto);
    await this.users.save(target);
    return target;
  }
}
