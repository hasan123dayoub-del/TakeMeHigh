import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessTokenPayload, AuthUser } from '../common/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(p: AccessTokenPayload): AuthUser {
    return {
      userId: p.sub,
      email: p.email,
      fullName: p.name,
      roleCode: p.role,
      scope: p.scp,
      branchId: p.bid,
      permissions: p.perms ?? [],
      mustChangePassword: !!p.mcp,
    };
  }
}
