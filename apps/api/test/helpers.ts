import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Agency } from '../src/modules/agencies/entities/agency.entity';
import { AgencySettings } from '../src/modules/agencies/entities/agency-settings.entity';
import { Destination } from '../src/modules/trips/entities/destination.entity';
import { Trip } from '../src/modules/trips/entities/trip.entity';
import { User } from '../src/modules/users/entities/user.entity';
import type { Role } from '@travelos/shared';

export const PASSWORD = 'Test-Pass-2026';

export async function createApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app, { swagger: false });
  await app.init();
  return { app, db: app.get(DataSource) };
}

/** An isolated throw-away agency, so tests never touch the demo data. */
export async function createTestAgency(db: DataSource, label: string) {
  const tag = `${label}-${randomUUID().slice(0, 8)}`;
  const agency = await db.getRepository(Agency).save({ name: `Test ${tag}`, slug: `test-${tag}`, currency: 'USD' });
  await db.getRepository(AgencySettings).save({ agencyId: agency.id, publicPageEnabled: true, depositPercent: '30.00' });
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const users: Record<string, User> = {};
  for (const role of ['OWNER', 'BOOKING_AGENT', 'ACCOUNTANT'] as Role[]) {
    users[role] = await db.getRepository(User).save({
      agencyId: agency.id,
      fullName: `${role} ${tag}`,
      email: `${role.toLowerCase()}.${tag}@test.travelos.local`,
      role,
      passwordHash,
    });
  }
  const destination = await db.getRepository(Destination).save({ agencyId: agency.id, name: 'Test City', country: 'Testland' });
  return { agency, users, destination, tag };
}

export async function createTrip(db: DataSource, agencyId: string, destinationId: string, overrides: Partial<Trip> = {}) {
  const departure = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const ret = new Date(Date.now() + 34 * 86_400_000).toISOString().slice(0, 10);
  const code = `T-${randomUUID().slice(0, 6)}`.toUpperCase();
  return db.getRepository(Trip).save({
    agencyId,
    destinationId,
    code,
    title: `Trip ${code}`,
    slug: `trip-${code.toLowerCase()}`,
    departureDate: departure,
    returnDate: ret,
    capacity: 10,
    seatsBooked: 0,
    pricePerPerson: '500.00',
    childPrice: '300.00',
    costPerPerson: '300.00',
    status: 'PUBLISHED',
    isPublic: true,
    ...overrides,
  });
}

export async function login(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  return res.body.accessToken as string;
}

/** Remove every row belonging to the test agency (FK checks off for the cleanup only). */
export async function dropAgency(db: DataSource, agencyId: string) {
  await db.transaction(async (m) => {
    await m.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of [
      'activity_logs', 'refunds', 'payments', 'booking_passengers', 'bookings', 'expenses', 'trip_suppliers',
      'trip_itineraries', 'trips', 'destinations', 'suppliers', 'customers', 'users', 'agency_settings',
    ]) {
      await m.query(`DELETE FROM \`${t}\` WHERE agency_id = ?`, [agencyId]);
    }
    await m.query('DELETE FROM agencies WHERE id = ?', [agencyId]);
    await m.query('SET FOREIGN_KEY_CHECKS = 1');
  });
}
