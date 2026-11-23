import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export const PASSWORD = 'TakeMeHigh@2026';
export const EMAILS = {
  admin: 'admin@takemehigh.local',
  mgrDam: 'manager.damascus@takemehigh.local',
  empDam: 'employee.damascus@takemehigh.local',
  guideDam: 'guide.damascus@takemehigh.local',
  mgrAlp: 'manager.aleppo@takemehigh.local',
  empAlp: 'employee.aleppo@takemehigh.local',
} as const;

export interface Ctx {
  app: INestApplication;
  prisma: PrismaService;
  tokens: Record<keyof typeof EMAILS, string>;
  http: (token?: string) => {
    get: (url: string) => request.Test;
    post: (url: string, body?: object) => request.Test;
    patch: (url: string, body?: object) => request.Test;
    put: (url: string, body?: object) => request.Test;
    delete: (url: string) => request.Test;
  };
}

export async function bootstrap(): Promise<Ctx> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, { swagger: false });
  await app.init();
  const prisma = app.get(PrismaService);
  const server = app.getHttpServer();
  const http = (token?: string) => {
    const auth = (t: request.Test) =>
      token ? t.set('Authorization', `Bearer ${token}`) : t;
    return {
      get: (url: string) => auth(request(server).get(`/api${url}`)),
      post: (url: string, body?: object) =>
        auth(request(server).post(`/api${url}`)).send(body ?? {}),
      patch: (url: string, body?: object) =>
        auth(request(server).patch(`/api${url}`)).send(body ?? {}),
      put: (url: string, body?: object) =>
        auth(request(server).put(`/api${url}`)).send(body ?? {}),
      delete: (url: string) => auth(request(server).delete(`/api${url}`)),
    };
  };
  const tokens = {} as Ctx['tokens'];
  for (const [key, email] of Object.entries(EMAILS)) {
    const res = await http()
      .post('/auth/login', { email, password: PASSWORD })
      .expect(200);
    tokens[key as keyof typeof EMAILS] = res.body.accessToken;
  }
  return { app, prisma, tokens, http };
}

/** Ids of seeded reference data by English name / code. */
export async function refs(prisma: PrismaService) {
  const [cities, categories, branches, services, items] = await Promise.all([
    prisma.city.findMany(),
    prisma.tripCategory.findMany(),
    prisma.branch.findMany(),
    prisma.service.findMany(),
    prisma.companyItem.findMany({
      include: { company: { include: { service: true } } },
    }),
  ]);
  const city = (en: string) => cities.find((c) => c.nameEn === en)!.id;
  const item = (externalRefOrName: string) =>
    items.find(
      (i) =>
        i.externalRef === externalRefOrName || i.name === externalRefOrName,
    )!;
  return {
    city,
    item,
    category: (en: string) => categories.find((c) => c.nameEn === en)!.id,
    branch: (part: string) => branches.find((b) => b.name.includes(part))!.id,
    service: (kind: string) => services.find((s) => s.kind === kind)!.id,
  };
}

const DAY = 86_400_000;

/**
 * Creates and publishes a Damascus → Latakia trip with bus + hotel (+ bus back) through the API,
 * starting `offset` days from now. Returns the trip.
 */
export async function makeTrip(
  ctx: Ctx,
  opts: {
    offset?: number;
    max?: number;
    min?: number;
    branchId?: string;
    publish?: boolean;
    title?: string;
  } = {},
) {
  const r = await refs(ctx.prisma);
  const offset = opts.offset ?? 30;
  const start = new Date(Date.now() + offset * DAY);
  start.setUTCHours(5, 0, 0, 0);
  const at = (d: number, h: number) =>
    new Date(start.getTime() + d * DAY + (h - 5) * 3_600_000);
  const admin = ctx.http(ctx.tokens.admin);
  const trip = await admin
    .post('/trips', {
      title:
        opts.title ?? `Test trip ${Math.random().toString(36).slice(2, 7)}`,
      categoryId: r.category('Leisure'),
      branchId: opts.branchId,
      originCityId: r.city('Damascus'),
      destinationCityId: r.city('Latakia'),
      startsAt: at(0, 5),
      endsAt: at(2, 18),
      registrationDeadline: at(-2, 20),
      minPassengers: opts.min ?? 1,
      maxPassengers: opts.max ?? 40,
      currencyCode: 'SYP',
      isPublic: true,
    })
    .expect(201);
  const id = trip.body.id as string;
  await admin
    .post(`/trips/${id}/lines`, {
      companyItemId: r.item('T-DAM-LTK-BUS').id,
      startsAt: at(0, 5),
      endsAt: at(0, 9),
    })
    .expect(201);
  await admin
    .post(`/trips/${id}/lines`, {
      companyItemId: r.item('H-LTK-STD').id,
      startsAt: at(0, 11),
      endsAt: at(2, 10),
    })
    .expect(201);
  await admin
    .post(`/trips/${id}/lines`, {
      companyItemId: r.item('T-LTK-DAM-BUS').id,
      startsAt: at(2, 12),
      endsAt: at(2, 17),
    })
    .expect(201);
  if (opts.publish !== false)
    await admin.post(`/trips/${id}/publish`).expect(200);
  return (await admin.get(`/trips/${id}`).expect(200)).body;
}

/** A Syrian customer with an ID card (and a passport when asked), registered in a branch. */
export async function makeCustomer(
  ctx: Ctx,
  token: string,
  opts: { branchId?: string; passport?: boolean; name?: string } = {},
) {
  const sy = await ctx.prisma.country.findUniqueOrThrow({
    where: { isoCode: 'SY' },
  });
  const http = ctx.http(token);
  const phone = `09${Math.floor(10000000 + Math.random() * 89999999)}`;
  const c = await http
    .post('/customers', {
      fullName: opts.name ?? `Customer ${phone}`,
      phone,
      nationalityCountryId: sy.id,
      branchId: opts.branchId,
    })
    .expect(201);
  await http
    .post(`/customers/${c.body.id}/documents`, {
      docType: 'SYRIAN_ID',
      docNumber: `ID${phone}`,
      issuingCountryId: sy.id,
    })
    .expect(201);
  if (opts.passport)
    await http
      .post(`/customers/${c.body.id}/documents`, {
        docType: 'PASSPORT',
        docNumber: `P${phone}`,
        issuingCountryId: sy.id,
        expiresOn: '2035-01-01',
      })
      .expect(201);
  return c.body as { id: string; fullName: string };
}

export const key = () =>
  `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
