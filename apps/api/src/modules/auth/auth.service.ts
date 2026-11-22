import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../../common/auth.types';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

/** Compared against when the email is unknown, so response time does not reveal which emails exist. */
const DUMMY_HASH = bcrypt.hashSync('travelos-timing-guard', 12);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.agency', 'agency')
      .where('u.email = :email', { email: dto.email.trim().toLowerCase() })
      .getOne();

    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid || !user.isActive || !user.agency?.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.users.update({ id: user.id }, { lastLoginAt: new Date() });

    const payload: JwtPayload = {
      sub: user.id,
      agencyId: user.agencyId,
      role: user.role,
      email: user.email,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: this.toProfile(user),
    };
  }

  async me(userId: string, agencyId: string) {
    const user = await this.users.findOne({
      where: { id: userId, agencyId },
      relations: { agency: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return this.toProfile(user);
  }

  private toProfile(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      agency: user.agency
        ? {
            id: user.agency.id,
            name: user.agency.name,
            slug: user.agency.slug,
            currency: user.agency.currency,
            logoUrl: user.agency.logoUrl,
          }
        : null,
    };
  }
}
