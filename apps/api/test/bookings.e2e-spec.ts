import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { ACCOUNTS, bearer, createApp, login } from './helpers';

/**
 * Business rules from the Master Project Context §25, tested against the real PostgreSQL database
 * through the HTTP API. Run `npm run db:reset` first for the canonical demo state.
 */
describe('Trips, pricing, bookings, seats, payments and refunds (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  let admin: string;
  let damascus: string;
  let aleppo: string;
  let coast: string;
  let ids: {
    coastStd: string;
    coastVip: string;
    aleppoTrip: string;
    wadi: string;
    tour: string;
    nawras: string;
    beach: string;
    shiraa: string;
    customer: string;
  };

  const trip = (code: string) =>
    prisma.trip.findFirstOrThrow({ where: { code } });
  const person = (n: number) => ({
    fullName: `Passenger ${n}`,
    documentType: 'NATIONAL_ID',
    documentNumber: String(100000 + n),
  });
  const people = (count: number, from = 1) =>
    Array.from({ length: count }, (_, i) => person(from + i));

  /** A fresh, opened trip in the Damascus branch with three priced services. */
  async function freshTrip(maxSeats: number, currencyCode = 'SYP') {
    const code = `QA-${randomUUID().slice(0, 6)}`.toUpperCase();
    const dep = new Date(Date.now() + 40 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const deadline = new Date(Date.now() + 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const created = await api()
      .post('/api/trips')
      .set(bearer(admin))
      .send({
        tourId: ids.tour,
        code,
        tripType: 'STANDARD',
        departureDate: dep,
        currencyCode,
        minPassengers: 1,
        maxSeats,
        registrationDeadline: deadline,
        services: [
          {
            serviceType: 'TRANSPORT',
            supplierId: ids.nawras,
            costPerPerson: '200000',
            profitPercent: '15',
          },
          {
            serviceType: 'HOTEL',
            supplierId: ids.beach,
            costPerPerson: '450000',
            profitPercent: '20',
          },
          {
            serviceType: 'RESTAURANT',
            supplierId: ids.shiraa,
            costPerPerson: '150000',
            profitPercent: '25',
          },
        ],
      })
      .expect(201);
    await api()
      .post(`/api/trips/${created.body.id}/open`)
      .set(bearer(admin))
      .expect(200);
    return created.body.id as string;
  }

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    admin = (await login(app, ACCOUNTS.shamAdmin)).accessToken;
    damascus = (await login(app, ACCOUNTS.shamReceptionDamascus)).accessToken;
    aleppo = (await login(app, ACCOUNTS.shamReceptionAleppo)).accessToken;
    coast = (await login(app, ACCOUNTS.coastAdmin)).accessToken;
    const coastStd = await trip('DL-STD-01');
    ids = {
      coastStd: coastStd.id,
      coastVip: (await trip('DL-VIP-01')).id,
      aleppoTrip: (await trip('ALP-01')).id,
      wadi: (await trip('WN-01')).id,
      tour: coastStd.tourId,
      nawras: (
        await prisma.supplier.findFirstOrThrow({
          where: { name: { startsWith: 'شركة النورس' } },
        })
      ).id,
      beach: (
        await prisma.supplier.findFirstOrThrow({
          where: { name: 'فندق الشاطئ الأزرق' },
        })
      ).id,
      shiraa: (
        await prisma.supplier.findFirstOrThrow({
          where: { name: 'مطعم الشراع' },
        })
      ).id,
      customer: (
        await prisma.customer.findFirstOrThrow({
          where: { office: { slug: 'sham-travel' } },
        })
      ).id,
    };
  });
  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------- pricing

  it('prices each service as cost × (1 + profit%) and sums them (the coach example: 200,000 → 230,000)', async () => {
    const res = await api()
      .get(`/api/trips/${ids.coastStd}`)
      .set(bearer(admin))
      .expect(200);
    const lines = Object.fromEntries(
      res.body.financials.perPerson.lines.map(
        (l: { serviceType: string; selling: string }) => [
          l.serviceType,
          l.selling,
        ],
      ),
    );
    expect(lines).toEqual({
      HOTEL: '540000.00',
      RESTAURANT: '187500.00',
      TRANSPORT: '230000.00',
    });
    expect(res.body.financials.perPerson).toMatchObject({
      cost: '800000.00',
      selling: '957500.00',
      margin: '157500.00',
    });
  });

  it('refuses two suppliers of the same service type, and opening a trip without services', async () => {
    const dep = new Date(Date.now() + 50 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await api()
      .post('/api/trips')
      .set(bearer(admin))
      .send({
        tourId: ids.tour,
        code: `QA-DUP-${randomUUID().slice(0, 4)}`,
        tripType: 'VIP',
        departureDate: dep,
        currencyCode: 'SYP',
        minPassengers: 1,
        maxSeats: 10,
        registrationDeadline: dep,
        services: [
          {
            serviceType: 'HOTEL',
            supplierId: ids.beach,
            costPerPerson: '1',
            profitPercent: '1',
          },
          {
            serviceType: 'HOTEL',
            supplierId: ids.beach,
            costPerPerson: '2',
            profitPercent: '1',
          },
        ],
      })
      .expect(400);
    const empty = await api()
      .post('/api/trips')
      .set(bearer(admin))
      .send({
        tourId: ids.tour,
        code: `QA-EMP-${randomUUID().slice(0, 4)}`,
        tripType: 'STANDARD',
        departureDate: dep,
        currencyCode: 'SYP',
        minPassengers: 1,
        maxSeats: 10,
        registrationDeadline: dep,
      })
      .expect(201);
    await api()
      .post(`/api/trips/${empty.body.id}/open`)
      .set(bearer(admin))
      .expect(400);
  });

  // ---------------------------------------------------------------- bookings & seats

  it('computes booking totals on the server with the active offer, and a PENDING booking takes no seats', async () => {
    const before = (await trip('DL-STD-01')).confirmedSeats;
    const res = await api()
      .post('/api/bookings')
      .set(bearer(damascus))
      .send({
        tripId: ids.coastStd,
        customerId: ids.customer,
        passengers: people(2),
      })
      .expect(201);
    expect(res.body).toMatchObject({
      status: 'PENDING',
      passengerCount: 2,
      currencyCode: 'SYP',
      unitPrice: '957500',
      subtotal: '1915000',
      discountAmount: '191500',
      totalAmount: '1723500',
      offerTitle: 'عرض العائلة',
    });
    expect(res.body.passengers).toHaveLength(2);
    expect((await trip('DL-STD-01')).confirmedSeats).toBe(before);
  });

  it('never oversells: 25 simultaneous confirmations on a 10-seat trip confirm exactly 10', async () => {
    const tripId = await freshTrip(10);
    const pending = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        api()
          .post('/api/bookings')
          .set(bearer(admin))
          .send({
            tripId,
            customer: {
              fullName: `Load ${i}`,
              phone: `+96390000${String(i).padStart(4, '0')}${randomUUID().slice(0, 2).replace(/\D/g, '1')}`,
            },
            passengers: [person(i)],
          }),
      ),
    );
    expect(pending.every((r) => r.status === 201)).toBe(true);
    const results = await Promise.all(
      pending.map((r) =>
        api().post(`/api/bookings/${r.body.id}/confirm`).set(bearer(admin)),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(10);
    expect(results.filter((r) => r.status === 409)).toHaveLength(15);
    const t = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    expect(t.confirmedSeats).toBe(10);
    expect(
      await prisma.booking.count({ where: { tripId, status: 'CONFIRMED' } }),
    ).toBe(10);
  });

  it('waiting list and cancellation: a full trip waitlists, cancelling a confirmed booking frees the seats', async () => {
    const tripId = await freshTrip(2);
    const a = await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({
        tripId,
        customerId: ids.customer,
        passengers: people(2),
        confirm: true,
      })
      .expect(201);
    expect(a.body.status).toBe('CONFIRMED');
    const b = await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({
        tripId,
        customerId: ids.customer,
        passengers: people(1),
        confirm: true,
        waitlistIfFull: true,
      })
      .expect(201);
    expect(b.body.status).toBe('WAITING_LIST');
    const rejected = await api()
      .post(`/api/bookings/${b.body.id}/confirm`)
      .set(bearer(admin))
      .expect(409);
    expect(rejected.body.message).toBe('This trip is fully booked.');

    await api()
      .post(`/api/bookings/${a.body.id}/cancel`)
      .set(bearer(admin))
      .send({ reason: 'Customer request' })
      .expect(200);
    expect(
      (await prisma.trip.findUniqueOrThrow({ where: { id: tripId } }))
        .confirmedSeats,
    ).toBe(0);
    await api()
      .post(`/api/bookings/${b.body.id}/confirm`)
      .set(bearer(admin))
      .expect(200);
    expect(
      (await prisma.trip.findUniqueOrThrow({ where: { id: tripId } }))
        .confirmedSeats,
    ).toBe(1);
  });

  it('a confirmed booking must keep its passenger count; a pending one is re-totalled with its original snapshot', async () => {
    const tripId = await freshTrip(10);
    const confirmed = await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({
        tripId,
        customerId: ids.customer,
        passengers: people(2),
        confirm: true,
      })
      .expect(201);
    await api()
      .patch(`/api/bookings/${confirmed.body.id}`)
      .set(bearer(admin))
      .send({ passengers: people(3) })
      .expect(409);

    const pending = await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({ tripId, customerId: ids.customer, passengers: people(1) })
      .expect(201);
    // the trip gets more expensive afterwards...
    await api()
      .put(`/api/trips/${tripId}/services`)
      .set(bearer(admin))
      .send({
        services: [
          {
            serviceType: 'TRANSPORT',
            supplierId: ids.nawras,
            costPerPerson: '999999',
            profitPercent: '50',
          },
        ],
      })
      .expect(200);
    const grown = await api()
      .patch(`/api/bookings/${pending.body.id}`)
      .set(bearer(admin))
      .send({ passengers: people(3) })
      .expect(200);
    // ...but the booking keeps its original unit price
    expect(grown.body.unitPrice).toBe(pending.body.unitPrice);
    expect(grown.body.passengerCount).toBe(3);
    expect(grown.body.totalAmount).toBe(
      String(Number(pending.body.unitPrice) * 3),
    );
  });

  // ---------------------------------------------------------------- payments & refunds

  it('payments: same currency as the booking, never above the balance', async () => {
    const tripId = await freshTrip(5);
    const b = await api()
      .post('/api/bookings')
      .set(bearer(damascus))
      .send({
        tripId,
        customerId: ids.customer,
        passengers: people(1),
        confirm: true,
      })
      .expect(201);
    await api()
      .post(`/api/bookings/${b.body.id}/payments`)
      .set(bearer(damascus))
      .send({ amount: '100', currencyCode: 'USD' })
      .expect(400);
    const over = await api()
      .post(`/api/bookings/${b.body.id}/payments`)
      .set(bearer(damascus))
      .send({ amount: '957500.01', currencyCode: 'SYP' })
      .expect(400);
    expect(over.body.message).toMatch(/remaining balance of 957500.00 SYP/);
    const paid = await api()
      .post(`/api/bookings/${b.body.id}/payments`)
      .set(bearer(damascus))
      .send({ amount: '400000', currencyCode: 'SYP' })
      .expect(201);
    expect(paid.body.receiptNumber).toMatch(/^RC-\d{6}-[A-Z0-9]{4}$/);
    const after = await api()
      .get(`/api/bookings/${b.body.id}`)
      .set(bearer(damascus))
      .expect(200);
    expect(after.body.balance).toBe('557500.00');
  });

  it('refunds: linked to the payment, partial allowed, never above the payment; Reception cannot refund', async () => {
    const tripId = await freshTrip(5);
    const b = await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({
        tripId,
        customerId: ids.customer,
        passengers: people(1),
        confirm: true,
        payment: { amount: '500000' },
      })
      .expect(201);
    const paymentId = b.body.payments[0].id;
    await api()
      .post(`/api/bookings/${b.body.id}/cancel`)
      .set(bearer(admin))
      .send({ reason: 'Changed plans' })
      .expect(200);

    await api()
      .post(`/api/payments/${paymentId}/refunds`)
      .set(bearer(damascus))
      .send({ amount: '1', reason: 'x refund' })
      .expect(403);
    await api()
      .post(`/api/payments/${paymentId}/refunds`)
      .set(bearer(admin))
      .send({ amount: '500000.01', reason: 'too much' })
      .expect(400);
    await api()
      .post(`/api/payments/${paymentId}/refunds`)
      .set(bearer(admin))
      .send({ amount: '300000', reason: 'partial refund' })
      .expect(201);
    await api()
      .post(`/api/payments/${paymentId}/refunds`)
      .set(bearer(admin))
      .send({ amount: '200000.01', reason: 'over the rest' })
      .expect(400);
    await api()
      .post(`/api/payments/${paymentId}/refunds`)
      .set(bearer(admin))
      .send({ amount: '200000', reason: 'the rest' })
      .expect(201);

    const after = await api()
      .get(`/api/bookings/${b.body.id}`)
      .set(bearer(admin))
      .expect(200);
    expect(after.body).toMatchObject({
      status: 'CANCELLED',
      paidAmount: '0',
      refundedAmount: '500000',
    });
    expect(after.body.payments).toHaveLength(1); // payment history is never deleted
    expect(after.body.payments[0].refunds).toHaveLength(2);
  });

  // ---------------------------------------------------------------- isolation

  it('branch isolation: Aleppo reception cannot see or book a Damascus trip', async () => {
    await api()
      .get(`/api/trips/${ids.coastStd}`)
      .set(bearer(aleppo))
      .expect(404);
    await api()
      .post('/api/bookings')
      .set(bearer(aleppo))
      .send({
        tripId: ids.coastStd,
        customerId: ids.customer,
        passengers: people(1),
      })
      .expect(404);
    const list = await api().get('/api/trips').set(bearer(aleppo)).expect(200);
    expect(list.body.data.map((t: { code: string }) => t.code)).toEqual(
      expect.arrayContaining(['ALP-01']),
    );
    expect(
      list.body.data.some((t: { code: string }) => t.code.startsWith('DL-')),
    ).toBe(false);
    const bookings = await api()
      .get('/api/bookings?pageSize=100')
      .set(bearer(aleppo))
      .expect(200);
    expect(
      bookings.body.data.every((b: { trip: { code: string } }) =>
        b.trip.code.startsWith('ALP'),
      ),
    ).toBe(true);
  });

  it('tenant isolation: another office gets 404 for our trips and bookings', async () => {
    const b = await prisma.booking.findFirstOrThrow({
      where: { tripId: ids.coastStd },
    });
    await api().get(`/api/bookings/${b.id}`).set(bearer(coast)).expect(404);
    await api()
      .get(`/api/trips/${ids.coastStd}`)
      .set(bearer(coast))
      .expect(404);
    await api()
      .post(`/api/bookings/${b.id}/confirm`)
      .set(bearer(coast))
      .expect(404);
  });

  // ---------------------------------------------------------------- transfer, offers, decisions

  it('transfer: refuses another currency, moves seats and keeps the old price in the history', async () => {
    const source = await freshTrip(5);
    const target = await freshTrip(5);
    const b = await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({
        tripId: source,
        customerId: ids.customer,
        passengers: people(2),
        confirm: true,
      })
      .expect(201);
    await api()
      .post(`/api/bookings/${b.body.id}/transfer`)
      .set(bearer(admin))
      .send({ targetTripId: ids.coastVip })
      .expect(409); // USD trip
    const moved = await api()
      .post(`/api/bookings/${b.body.id}/transfer`)
      .set(bearer(admin))
      .send({ targetTripId: target, reason: 'Date change' })
      .expect(200);
    expect(moved.body.trip.id).toBe(target);
    expect(
      (await prisma.trip.findUniqueOrThrow({ where: { id: source } }))
        .confirmedSeats,
    ).toBe(0);
    expect(
      (await prisma.trip.findUniqueOrThrow({ where: { id: target } }))
        .confirmedSeats,
    ).toBe(2);
    const transfer = moved.body.events.find(
      (e: { type: string }) => e.type === 'TRANSFERRED',
    );
    expect(transfer).toMatchObject({ fromTripId: source, toTripId: target });
    expect(transfer.data.previous.total).toBe('1915000.00');
  });

  it('offers: refuses overlapping periods and fixed discounts at or above the price', async () => {
    const tripId = await freshTrip(5);
    const today = new Date().toISOString().slice(0, 10);
    const later = new Date(Date.now() + 10 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await api()
      .post(`/api/trips/${tripId}/offers`)
      .set(bearer(admin))
      .send({
        title: 'Too big',
        discountType: 'FIXED',
        discountValue: '957500',
        startsAt: today,
        endsAt: later,
      })
      .expect(400);
    await api()
      .post(`/api/trips/${tripId}/offers`)
      .set(bearer(admin))
      .send({
        title: 'Spring',
        discountType: 'PERCENTAGE',
        discountValue: '10',
        startsAt: today,
        endsAt: later,
      })
      .expect(201);
    await api()
      .post(`/api/trips/${tripId}/offers`)
      .set(bearer(admin))
      .send({
        title: 'Overlap',
        discountType: 'PERCENTAGE',
        discountValue: '5',
        startsAt: later,
        endsAt: later,
      })
      .expect(409);
  });

  it('registration closes at the deadline; Reception cannot decide; Admin can extend, then approve', async () => {
    const tripId = await freshTrip(10);
    await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({
        tripId,
        customerId: ids.customer,
        passengers: people(3),
        confirm: true,
      })
      .expect(201);
    // fixture: the deadline passed yesterday
    await prisma.trip.update({
      where: { id: tripId },
      data: { registrationDeadline: new Date(Date.now() - 86_400_000) },
    });

    const closed = await api()
      .get(`/api/trips/${tripId}`)
      .set(bearer(admin))
      .expect(200);
    expect(closed.body.status).toBe('REGISTRATION_CLOSED');
    await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({ tripId, customerId: ids.customer, passengers: people(1) })
      .expect(409);

    await api()
      .post(`/api/trips/${tripId}/decision`)
      .set(bearer(damascus))
      .send({ decision: 'APPROVE' })
      .expect(403);
    const newDeadline = new Date(Date.now() + 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const extended = await api()
      .post(`/api/trips/${tripId}/decision`)
      .set(bearer(admin))
      .send({ decision: 'EXTEND', newDeadline })
      .expect(200);
    expect(extended.body).toMatchObject({
      status: 'OPEN',
      registrationClosesOn: newDeadline,
    });

    const approved = await api()
      .post(`/api/trips/${tripId}/decision`)
      .set(bearer(admin))
      .send({ decision: 'APPROVE', note: 'Enough passengers' })
      .expect(200);
    expect(approved.body.status).toBe('APPROVED');
    expect(
      approved.body.decisions.map((d: { decision: string }) => d.decision),
    ).toEqual(['APPROVE', 'EXTEND']);
    expect(approved.body.decisions[0]).toMatchObject({
      confirmedAtDecision: 3,
      minPassengers: 1,
    });
  });

  it('cancelling a trip by decision cancels its bookings and releases every seat', async () => {
    const tripId = await freshTrip(10);
    await api()
      .post('/api/bookings')
      .set(bearer(admin))
      .send({
        tripId,
        customerId: ids.customer,
        passengers: people(2),
        confirm: true,
        payment: { amount: '100000' },
      })
      .expect(201);
    const res = await api()
      .post(`/api/trips/${tripId}/decision`)
      .set(bearer(admin))
      .send({ decision: 'CANCEL', note: 'Not enough passengers' })
      .expect(200);
    expect(res.body).toMatchObject({ status: 'CANCELLED', confirmedSeats: 0 });
    const bookings = await prisma.booking.findMany({
      where: { tripId },
      include: { payments: true },
    });
    expect(bookings.every((b) => b.status === 'CANCELLED')).toBe(true);
    expect(bookings[0].payments).toHaveLength(1); // kept for a manual refund
  });
});
