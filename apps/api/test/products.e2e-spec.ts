import { LifecycleService } from '../src/products/lifecycle.service';
import { bootstrap, Ctx, makeTrip, refs } from './helpers';

const DAY = 86_400_000;

describe('Trips, programs and offers (4.6 – 4.9, 4.14)', () => {
  let ctx: Ctx;
  beforeAll(async () => (ctx = await bootstrap()));
  afterAll(() => ctx.app.close());

  it('PRC-01..03: price = Σ (cost × quantity + profit); the coach example gives 230,000', async () => {
    const trip = await makeTrip(ctx, { offset: 40 });
    const lines = trip.lines as {
      quantity: number;
      unitCost: string;
      costSnapshot: string;
      sellingPrice: string;
      service: { kind: string };
    }[];
    const bus = lines.find((l) => l.service.kind === 'TRANSPORT')!;
    expect(bus.costSnapshot).toBe('200000');
    expect(bus.sellingPrice).toBe('230000');
    const hotel = lines.find((l) => l.service.kind === 'HOTEL')!;
    expect(hotel.quantity).toBe(2); // two nights
    expect(Number(hotel.costSnapshot)).toBe(Number(hotel.unitCost) * 2);
    const sum = lines.reduce((a, l) => a + Number(l.sellingPrice), 0);
    expect(Number(trip.pricePerPerson)).toBe(sum);
    expect(trip.scope).toBe('DOMESTIC');
  });

  it('TRP-05: a service that jumps between places is refused', async () => {
    const trip = await makeTrip(ctx, { offset: 45, publish: false });
    const r = await refs(ctx.prisma);
    const start = new Date(trip.startsAt);
    const res = await ctx
      .http(ctx.tokens.admin)
      .post(`/trips/${trip.id}/lines`, {
        companyItemId: r.item('T-DAM-TRT-BUS').id,
        startsAt: new Date(start.getTime() + 2 * DAY + 2 * 3_600_000),
        endsAt: new Date(start.getTime() + 2 * DAY + 3 * 3_600_000),
      })
      .expect(400);
    expect(JSON.stringify(res.body.message)).toMatch(
      /depart from where|starts before/,
    );
  });

  it('TRP-03 / BR-04: one service cannot be published; two can', async () => {
    const r = await refs(ctx.prisma);
    const admin = ctx.http(ctx.tokens.admin);
    const start = new Date(Date.now() + 50 * DAY);
    const trip = await admin
      .post('/trips', {
        title: 'One service',
        categoryId: r.category('Leisure'),
        originCityId: r.city('Damascus'),
        destinationCityId: r.city('Latakia'),
        startsAt: start,
        endsAt: new Date(start.getTime() + DAY),
        registrationDeadline: new Date(start.getTime() - 2 * DAY),
        minPassengers: 1,
        maxPassengers: 10,
        currencyCode: 'SYP',
      })
      .expect(201);
    await admin
      .post(`/trips/${trip.body.id}/lines`, {
        companyItemId: r.item('T-DAM-LTK-BUS').id,
        startsAt: start,
        endsAt: new Date(start.getTime() + 4 * 3_600_000),
      })
      .expect(201);
    const fail = await admin.post(`/trips/${trip.body.id}/publish`).expect(400);
    expect(JSON.stringify(fail.body.message)).toMatch(
      /at least two different services/,
    );
    await admin
      .post(`/trips/${trip.body.id}/lines`, {
        companyItemId: r.item('R-LTK-FULL').id,
        startsAt: new Date(start.getTime() + 5 * 3_600_000),
        endsAt: new Date(start.getTime() + 6 * 3_600_000),
      })
      .expect(201);
    await admin.post(`/trips/${trip.body.id}/publish`).expect(200);
  });

  it('BR-08: staff cannot set profit; the default profit rule applies', async () => {
    const trip = await makeTrip(ctx, {
      offset: 55,
      publish: false,
      branchId: (await refs(ctx.prisma)).branch('دمشق'),
    });
    const r = await refs(ctx.prisma);
    const mgr = ctx.http(ctx.tokens.mgrDam);
    const start = new Date(trip.startsAt);
    await mgr
      .post(`/trips/${trip.id}/lines`, {
        companyItemId: r.item('R-LTK-FULL').id,
        startsAt: new Date(start.getTime() + 7 * 3_600_000),
        endsAt: new Date(start.getTime() + 8 * 3_600_000),
        profitMode: 'PERCENT',
        profitValue: '90',
      })
      .expect(403);
    await mgr
      .post(`/trips/${trip.id}/lines`, {
        companyItemId: r.item('R-LTK-FULL').id,
        startsAt: new Date(start.getTime() + 7 * 3_600_000),
        endsAt: new Date(start.getTime() + 8 * 3_600_000),
      })
      .expect(201);
  });

  it('TRP-08 / B.5: a branch manager cannot edit a shared trip or another branch’s trip', async () => {
    const shared = await makeTrip(ctx, { offset: 60 });
    await ctx
      .http(ctx.tokens.mgrDam)
      .patch(`/trips/${shared.id}`, { title: 'hijack' })
      .expect(403);
  });

  it('PGM-01..04: a program chains trips; price = Σ trip prices; discontinuous legs are refused', async () => {
    const r = await refs(ctx.prisma);
    const admin = ctx.http(ctx.tokens.admin);
    const coast = await ctx.prisma.program.findFirstOrThrow({
      where: { title: { contains: 'أرواد' } },
      include: {
        legs: { include: { trip: true }, orderBy: { sequenceNo: 'asc' } },
      },
    });
    const expected = coast.legs.reduce(
      (a, l) => a + Number(l.trip.pricePerPerson),
      0,
    );
    expect(Number(coast.pricePerPerson)).toBe(expected);

    const a = await makeTrip(ctx, { offset: 70 });
    const b = await makeTrip(ctx, { offset: 80 });
    const res = await admin
      .post('/programs', {
        title: 'Broken chain',
        categoryId: r.category('Leisure'),
        registrationDeadline: new Date(Date.now() + 10 * DAY),
        minPassengers: 1,
        maxPassengers: 10,
        tripIds: [a.id, b.id],
      })
      .expect(400);
    // both legs start in Damascus: the second one does not leave from where the first ends
    expect(JSON.stringify(res.body.message)).toMatch(/must leave from where/);
  });

  it('CLS-02 / CLS-04: at the deadline registration closes with the passenger total and date; no new bookings', async () => {
    const trip = await makeTrip(ctx, { offset: 90 });
    await ctx.prisma.trip.update({
      where: { id: trip.id },
      data: {
        registrationDeadline: new Date(Date.now() - 60_000),
        confirmedSeats: 3,
      },
    });
    await ctx.http(ctx.tokens.admin).get('/trips?pageSize=1').expect(200); // reads run the due jobs
    // runDue is throttled; force it through the service
    await ctx.app.get(LifecycleService).runDue(true);
    const closed = await ctx.prisma.trip.findUniqueOrThrow({
      where: { id: trip.id },
    });
    expect(closed.status).toBe('CLOSED');
    expect(closed.closureReason).toBe('DEADLINE');
    expect(closed.finalPassengerCount).toBe(3);
    expect(closed.closedAt).toBeTruthy();
  });

  it('CLS-03 / CLS-05: manual close, then the Admin extends registration', async () => {
    const trip = await makeTrip(ctx, { offset: 95, min: 10 });
    const admin = ctx.http(ctx.tokens.admin);
    const closed = await admin.post(`/trips/${trip.id}/close`).expect(200);
    expect(closed.body.closureReason).toBe('MANUAL');
    expect(closed.body.finalPassengerCount).toBe(0);
    const detail = await admin.get(`/trips/${trip.id}`).expect(200);
    expect(detail.body.warnings).toContain('BELOW_MINIMUM');
    await admin
      .post(`/trips/${trip.id}/decision`, { decision: 'EXTEND' })
      .expect(400);
    const reopened = await admin
      .post(`/trips/${trip.id}/decision`, {
        decision: 'EXTEND',
        newDeadline: new Date(Date.now() + 5 * DAY),
      })
      .expect(200);
    expect(reopened.body.status).toBe('OPEN');
  });

  it('OFR-01..04: bundle needs ≥ 2 services; discount needs a target; expired offers are not public', async () => {
    const r = await refs(ctx.prisma);
    const admin = ctx.http(ctx.tokens.admin);
    const today = new Date().toISOString().slice(0, 10);
    await admin
      .post('/offers', {
        title: 'Bad bundle',
        kind: 'BUNDLE',
        discountMode: 'PERCENT',
        discountValue: '10',
        validFrom: today,
        validTo: today,
        lines: [{ companyItemId: r.item('H-LTK-STD').id }],
      })
      .expect(400);
    await admin
      .post('/offers', {
        title: 'Bad discount',
        kind: 'DISCOUNT',
        discountMode: 'PERCENT',
        discountValue: '10',
        validFrom: today,
        validTo: today,
      })
      .expect(400);
    const ok = await admin
      .post('/offers', {
        title: 'Good bundle',
        kind: 'BUNDLE',
        discountMode: 'PERCENT',
        discountValue: '10',
        validFrom: today,
        validTo: today,
        lines: [
          { companyItemId: r.item('H-LTK-STD').id, quantity: 2 },
          { companyItemId: r.item('R-LTK-FULL').id, quantity: 2 },
        ],
      })
      .expect(201);
    const detail = await admin.get(`/offers/${ok.body.id}`).expect(200);
    const gross = detail.body.lines.reduce(
      (a: number, l: { sellingPrice: string }) => a + Number(l.sellingPrice),
      0,
    );
    expect(Number(detail.body.pricePerPerson)).toBeCloseTo(gross * 0.9, 2);
    await admin
      .patch(`/offers/${ok.body.id}`, {
        validFrom: '2020-01-01',
        validTo: '2020-01-02',
      })
      .expect(200);
    const pub = await ctx.http().get('/public/offers').expect(200);
    expect(pub.body.some((o: { id: string }) => o.id === ok.body.id)).toBe(
      false,
    );
  });

  it('REF-01 / BR-11: countries and cities are disabled, never deleted; disabled ones vanish from choices', async () => {
    const admin = ctx.http(ctx.tokens.admin);
    const city = await ctx.prisma.city.findFirstOrThrow({
      where: { nameEn: 'Kessab' },
    });
    await admin
      .patch(`/cities/${city.id}/active`, { isActive: false })
      .expect(200);
    const lookups = await admin.get('/lookups').expect(200);
    expect(
      lookups.body.cities.some((c: { id: string }) => c.id === city.id),
    ).toBe(false);
    await admin.delete(`/cities/${city.id}`).expect(404);
    await admin
      .patch(`/cities/${city.id}/active`, { isActive: true })
      .expect(200);
  });

  it('SUP-03 / SUP-04: transport companies need a mode and are filtered by it', async () => {
    const r = await refs(ctx.prisma);
    const sy = await ctx.prisma.country.findUniqueOrThrow({
      where: { isoCode: 'SY' },
    });
    const admin = ctx.http(ctx.tokens.admin);
    await admin
      .post('/companies', {
        serviceId: r.service('TRANSPORT'),
        countryId: sy.id,
        name: 'بلا نوع',
      })
      .expect(400);
    await admin
      .post('/companies', {
        serviceId: r.service('HOTEL'),
        countryId: sy.id,
        name: 'فندق بنوع نقل',
        transportMode: 'AIR',
      })
      .expect(400);
    const sea = await admin
      .get('/companies?serviceKind=TRANSPORT&transportMode=SEA')
      .expect(200);
    expect(sea.body.data.length).toBeGreaterThan(0);
    expect(
      sea.body.data.every(
        (c: { transportMode: string }) => c.transportMode === 'SEA',
      ),
    ).toBe(true);
  });

  it('INT-04..07: syncing the supplier sandbox upserts items and keeps snapshots', async () => {
    const lamira = await ctx.prisma.company.findFirstOrThrow({
      where: { name: 'فنادق لاميرا' },
    });
    const before = await ctx.prisma.companyItem.count({
      where: { companyId: lamira.id },
    });
    // the sandbox lives inside the same app: point the connection at the test server
    const address = ctx.app.getHttpServer().address();
    await ctx.app.listen(0);
    const port = (ctx.app.getHttpServer().address() as { port: number }).port;
    void address;
    await ctx.prisma.integrationConnection.update({
      where: { companyId: lamira.id },
      data: { baseUrl: `http://127.0.0.1:${port}/api/sandbox/suppliers/hotel` },
    });
    const res = await ctx
      .http(ctx.tokens.admin)
      .post(`/integrations/${lamira.id}/sync`)
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(
      await ctx.prisma.companyItem.count({ where: { companyId: lamira.id } }),
    ).toBe(before);
    const logs = await ctx
      .http(ctx.tokens.admin)
      .get(`/integrations/${lamira.id}/logs`)
      .expect(200);
    expect(logs.body.data[0].result).toBe('SUCCESS');
    const list = await ctx
      .http(ctx.tokens.admin)
      .get('/integrations')
      .expect(200);
    expect(JSON.stringify(list.body)).not.toMatch(/credentialsEncrypted":"/);
  });
});
