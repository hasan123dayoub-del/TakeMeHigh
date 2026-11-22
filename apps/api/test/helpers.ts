import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/** Demo accounts from prisma/seed.ts (run `npm run db:reset` for a clean state). */
export const PASSWORD = 'Safarni@2026';
export const ACCOUNTS = {
  platform: 'platform@safarni.local',
  shamAdmin: 'admin@sham-travel.safarni.local',
  shamReceptionDamascus: 'reception.damascus@sham-travel.safarni.local',
  shamReceptionAleppo: 'reception.aleppo@sham-travel.safarni.local',
  coastAdmin: 'admin@coast-tours.safarni.local',
} as const;

export async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app, { swagger: false });
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function login(app: INestApplication, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return res.body as {
    accessToken: string;
    refreshToken: string;
    user: {
      office: { id: string } | null;
      branch: { id: string } | null;
      role: { scope: string } | null;
      permissions: string[];
    };
  };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
