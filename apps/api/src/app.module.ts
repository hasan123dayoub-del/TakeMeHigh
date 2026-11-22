import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { resolve } from 'path';
import { AuditModule } from './audit-logs/audit.module';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../../.env'),
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    IntegrationsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
