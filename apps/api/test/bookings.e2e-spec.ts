import { LifecycleService } from '../src/products/lifecycle.service';
import { bootstrap, Ctx, key, makeCustomer, makeTrip } from './helpers';

describe('Bookings, seats, documents and payments (4.10 – 4.13)', () => {
  let ctx: Ctx;
  beforeAll(async () => (ctx = await bootstrap()));
  afterAll(() => ctx.app.close());

  const book = async (token: string, body: object) =>
    (await ctx.http(token).post('/bookings', body).expect(201)).body;
  const pay = (token: string, bookingId: string, amount: string, k = key()) =>
    ctx
      .http(token)
      .post(`/bookings/${bookingId}/payments`, { amount, idempotencyKey: k });

  it('BKG-05: 12 simultaneous confirmations on 5 seats give exactly 5 confirmed and 7 on the waitlist', async () => {
    const trip = await makeTrip(ctx, { offset: 33, max: 5 });
    const bookings = [];
    for (let i = 0; i < 12; i++) {
      const c = await makeCustomer(ctx, ctx.tokens.empDam);
      const b = await book(ctx.tokens.empDam, {
        tripId: trip.id,
        payerCustomerId: c.id,
        passengers: [{ customerId: c.id }],
      });
      await pay(ctx.tokens.empDam, b.id, '100000').expect(201);
      bookings.push(b);
    }
    const results = await Promise.all(
      bookings.map((b) =>
        ctx.http(ctx.tokens.empDam).post(`/bookings/${b.id}/confirm`),
      ),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    const statuses = await ctx.prisma.booking.groupBy({
      by: ['status'],
      where: { tripId: trip.id },
      _count: true,
    });
    const count = (s: string) =>
      statuses.find((x) => x.status === s)?._count ?? 0;
    expect(count('CONFIRMED')).toBe(5);
    expect(count('WAITLIST')).toBe(7);
    expect(
      (await ctx.prisma.trip.findUniqueOrThrow({ where: { id: trip.id } }))
        .confirmedSeats,
    ).toBe(5);

    // BKG-09: cancelling frees the seat and suggests the waitlist
    const confirmed = await ctx.prisma.booking.findFirstOrThrow({
      where: { tripId: trip.id, status: 'CONFIRMED' },
    });
    const cancelled = await ctx
      .http(ctx.tokens.mgrDam)
      .post(`/bookings/${confirmed.id}/cancel`, { reason: 'طلب الزبون' })
      .expect(200);
    expect(cancelled.body.waitlistSuggestions.length).toBeGreaterThan(0);
    expect(
      (await ctx.prisma.trip.findUniqueOrThrow({ where: { id: trip.id } }))
        .confirmedSeats,
    ).toBe(4);
    const promoted = await ctx
      .http(ctx.tokens.empDam)
      .post(`/bookings/${cancelled.body.waitlistSuggestions[0].id}/confirm`)
      .expect(200);
    expect(promoted.body.status).toBe('CONFIRMED');
  });

  it('TBD-07 / BKG-07: confirmation needs a first payment and complete documents', async () => {
    const trip = await makeTrip(ctx, { offset: 34 });
    const sy = await ctx.prisma.country.findUniqueOrThrow({
      where: { isoCode: 'SY' },
    });
    const c = await ctx
      .http(ctx.tokens.empDam)
      .post('/customers', {
        fullName: 'بلا وثيقة',
        phone: '0999000111',
        nationalityCountryId: sy.id,
      })
      .expect(201);
    const b = await book(ctx.tokens.empDam, {
      tripId: trip.id,
      payerCustomerId: c.body.id,
      passengers: [{ customerId: c.body.id }],
    });
    expect(b.warnings.length).toBe(1);
    await ctx
      .http(ctx.tokens.empDam)
      .post(`/bookings/${b.id}/confirm`)
      .expect(409);
    await pay(ctx.tokens.empDam, b.id, '1000').expect(201);
    const res = await ctx
      .http(ctx.tokens.empDam)
      .post(`/bookings/${b.id}/confirm`)
      .expect(400);
    expect(JSON.stringify(res.body.message)).toMatch(/Syrian ID/);
  });

  it('BKG-10 / PGM-04: a program booking takes a seat on every leg and appears on each trip’s manifest', async () => {
    const program = await ctx.prisma.program.findFirstOrThrow({
      where: { title: { contains: 'أرواد' } },
      include: { legs: { include: { trip: true } } },
    });
    const before = program.legs.map((l) => l.trip.confirmedSeats);
    const c = await makeCustomer(ctx, ctx.tokens.empDam);
    const b = await book(ctx.tokens.empDam, {
      programId: program.id,
      payerCustomerId: c.id,
      passengers: [{ customerId: c.id }],
    });
    await pay(ctx.tokens.empDam, b.id, '50000').expect(201);
    await ctx
      .http(ctx.tokens.empDam)
      .post(`/bookings/${b.id}/confirm`)
      .expect(200);
    const legs = await ctx.prisma.trip.findMany({
      where: { id: { in: program.legs.map((l) => l.tripId) } },
    });
    for (const [i, l] of program.legs.entries())
      expect(legs.find((t) => t.id === l.tripId)!.confirmedSeats).toBe(
        before[i] + 1,
      );
    const manifest = await ctx
      .http(ctx.tokens.admin)
      .get(`/trips/${program.legs[0].tripId}/passengers`)
      .expect(200);
    expect(
      manifest.body.passengers.some(
        (p: { customer: { id: string }; viaProgramId: string }) =>
          p.customer.id === c.id && p.viaProgramId === program.id,
      ),
    ).toBe(true);
    // the same person cannot be booked again on a leg of that program
    await ctx
      .http(ctx.tokens.empDam)
      .post('/bookings', {
        tripId: program.legs[0].tripId,
        payerCustomerId: c.id,
        passengers: [{ customerId: c.id }],
      })
      .expect(409);
  });

  it('VIS-01 / CUS-03: an international program needs passports and creates visa records', async () => {
    const umrah = await ctx.prisma.program.findFirstOrThrow({
      where: { scope: 'INTERNATIONAL' },
    });
    const noPassport = await makeCustomer(ctx, ctx.tokens.empDam);
    const withPassport = await makeCustomer(ctx, ctx.tokens.empDam, {
      passport: true,
    });
    const b = await book(ctx.tokens.empDam, {
      programId: umrah.id,
      payerCustomerId: withPassport.id,
      passengers: [
        { customerId: withPassport.id },
        { customerId: noPassport.id },
      ],
    });
    expect(b.warnings.join()).toMatch(/passport is required/);
    expect(b.discountAmount).toBe('100'); // the early-booking offer: 50 USD × 2, applied automatically
    const visas = await ctx.prisma.visaApplication.count({
      where: { passenger: { bookingId: b.id } },
    });
    expect(visas).toBe(2);
  });

  it('PAY-02..06: no overpayment; refunds never exceed the payment; payments are append-only', async () => {
    const trip = await makeTrip(ctx, { offset: 36 });
    const c = await makeCustomer(ctx, ctx.tokens.empDam);
    const b = await book(ctx.tokens.empDam, {
      tripId: trip.id,
      payerCustomerId: c.id,
      passengers: [{ customerId: c.id }],
    });
    await pay(
      ctx.tokens.empDam,
      b.id,
      String(Number(b.totalAmount) + 1),
    ).expect(400);
    const k = key();
    const first = await pay(ctx.tokens.empDam, b.id, '500000', k).expect(201);
    const again = await pay(ctx.tokens.empDam, b.id, '500000', k).expect(201); // PAY-10 double click
    expect(again.body.id).toBe(first.body.id);
    expect(first.body.kind).toBe('PARTIAL');
    expect(first.body.receiptNo).toMatch(/^RCP-\d{4}-\d{6}$/);
    const rest = String(Number(b.totalAmount) - 500000);
    const full = await pay(ctx.tokens.empDam, b.id, rest).expect(201);
    expect(full.body.kind).toBe('FULL');
    expect(full.body.bookingTotals.paymentState).toBe('PAID');

    await ctx
      .http(ctx.tokens.empDam)
      .post(`/payments/${first.body.id}/refund`, {
        amount: '1000',
        reason: 'خطأ',
      })
      .expect(403);
    await ctx
      .http(ctx.tokens.admin)
      .post(`/payments/${first.body.id}/refund`, {
        amount: '600000',
        reason: 'خطأ',
      })
      .expect(400);
    const refund = await ctx
      .http(ctx.tokens.admin)
      .post(`/payments/${first.body.id}/refund`, {
        amount: '200000',
        reason: 'استرجاع جزئي',
      })
      .expect(201);
    expect(refund.body.kind).toBe('REFUND');
    expect(refund.body.refundOf.receiptNo).toBe(first.body.receiptNo);

    await expect(
      ctx.prisma.payment.update({
        where: { id: first.body.id },
        data: { amount: '1' },
      }),
    ).rejects.toThrow();
    await expect(
      ctx.prisma.payment.delete({ where: { id: first.body.id } }),
    ).rejects.toThrow();
  });

  it('PAY-04 / PAY-08: the receipt carries payer, type, number, date and amount; reprints are copies', async () => {
    const payment = await ctx.prisma.payment.findFirstOrThrow({
      where: {
        kind: { not: 'REFUND' },
        branch: { name: { contains: 'دمشق' } },
      },
    });
    const r = await ctx
      .http(ctx.tokens.empDam)
      .get(`/payments/${payment.id}/receipt`)
      .expect(200);
    for (const k of [
      'payerName',
      'kind',
      'receiptNo',
      'paidAt',
      'amount',
      'currencyCode',
    ])
      expect(r.body[k]).toBeDefined();
    expect(r.body.office.officeName).toBeTruthy();
    const p1 = await ctx
      .http(ctx.tokens.empDam)
      .post(`/payments/${payment.id}/printed`)
      .expect(200);
    const p2 = await ctx
      .http(ctx.tokens.empDam)
      .post(`/payments/${payment.id}/printed`)
      .expect(200);
    expect(p1.body.copy).toBe(false);
    expect(p2.body.copy).toBe(true);
  });

  it('BKG-06: after the deadline only the Admin can still register, and it is audited', async () => {
    const trip = await makeTrip(ctx, { offset: 38 });
    await ctx.prisma.trip.update({
      where: { id: trip.id },
      data: {
        registrationDeadline: new Date(Date.now() - 1000),
        status: 'OPEN',
      },
    });
    // keep it OPEN for this check (the deadline job is disabled in tests)
    const c = await makeCustomer(ctx, ctx.tokens.admin, {
      branchId: (await ctx.prisma.branch.findFirstOrThrow()).id,
    });
    jest
      .spyOn(ctx.app.get(LifecycleService), 'runDue')
      .mockResolvedValue(undefined);
    await ctx
      .http(ctx.tokens.admin)
      .post('/bookings', {
        tripId: trip.id,
        payerCustomerId: c.id,
        passengers: [{ customerId: c.id }],
        branchId: (await ctx.prisma.branch.findFirstOrThrow()).id,
      })
      .expect(409);
    const ok = await ctx
      .http(ctx.tokens.admin)
      .post('/bookings', {
        tripId: trip.id,
        payerCustomerId: c.id,
        passengers: [{ customerId: c.id }],
        branchId: (await ctx.prisma.branch.findFirstOrThrow()).id,
        overrideDeadline: true,
      })
      .expect(201);
    const audit = await ctx.prisma.auditLog.findFirstOrThrow({
      where: { entityId: ok.body.id, action: 'booking.created' },
    });
    expect(audit.summary).toMatch(/Admin override/);
    jest.restoreAllMocks();
  });

  it('RPT-01: every list exports to Excel with the current filters', async () => {
    for (const url of [
      '/bookings?status=CONFIRMED&export=xlsx',
      '/payments?export=xlsx',
      '/customers?export=xlsx',
      '/trips?export=xlsx',
      '/visas?export=xlsx',
    ]) {
      const res = await ctx
        .http(ctx.tokens.admin)
        .get(url)
        .buffer(true)
        .expect(200);
      expect(res.headers['content-type']).toMatch(/spreadsheetml/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
    }
    const all = await ctx
      .http(ctx.tokens.empDam)
      .get('/bookings?export=all')
      .expect(200);
    expect(all.body.data.length).toBe(all.body.meta.total);
  });

  it('RPT-04: monthly statistics per currency, Admin only', async () => {
    const res = await ctx
      .http(ctx.tokens.admin)
      .get('/stats?period=month')
      .expect(200);
    expect(res.body.series.length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(res.body.totals)).toEqual(
      expect.arrayContaining(['SYP', 'USD']),
    );
    const year = await ctx
      .http(ctx.tokens.admin)
      .get('/stats?period=year')
      .expect(200);
    expect(Number(year.body.totals.SYP.realizedProfit)).toBeGreaterThan(0);
    await ctx.http(ctx.tokens.mgrDam).get('/stats').expect(403);
  });
});
