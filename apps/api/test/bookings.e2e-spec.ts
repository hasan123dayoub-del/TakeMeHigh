import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Trip } from '../src/modules/trips/entities/trip.entity';
import { createApp, createTestAgency, createTrip, dropAgency, login } from './helpers';

describe('Bookings, seats and payments (e2e, real MariaDB)', () => {
  let app: INestApplication;
  let db: DataSource;
  let a: Awaited<ReturnType<typeof createTestAgency>>;
  let b: Awaited<ReturnType<typeof createTestAgency>>;
  let ownerA: string;
  let agentA: string;
  let ownerB: string;

  const api = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const newCustomer = (i: number) => ({ firstName: 'Guest', lastName: `No${i}`, phone: `+963 900 000 ${String(i).padStart(3, '0')}` });

  beforeAll(async () => {
    ({ app, db } = await createApp());
    a = await createTestAgency(db, 'a');
    b = await createTestAgency(db, 'b');
    ownerA = await login(app, a.users.OWNER.email);
    agentA = await login(app, a.users.BOOKING_AGENT.email);
    ownerB = await login(app, b.users.OWNER.email);
  });

  afterAll(async () => {
    await dropAgency(db, a.agency.id);
    await dropAgency(db, b.agency.id);
    await app.close();
  });

  it('never oversells: 25 simultaneous 1-seat bookings on a 10-seat trip give exactly 10 bookings', async () => {
    const trip = await createTrip(db, a.agency.id, a.destination.id, { capacity: 10 });

    const results = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        api().post('/api/bookings').set(auth(agentA)).send({ tripId: trip.id, customer: newCustomer(i), adults: 1 }),
      ),
    );

    const created = results.filter((r) => r.status === 201).length;
    const rejected = results.filter((r) => r.status === 409).length;
    expect(created).toBe(10);
    expect(rejected).toBe(15);
    expect(results.find((r) => r.status === 409)?.body.message).toMatch(/fully booked|seat/i);

    const fresh = await db.getRepository(Trip).findOneByOrFail({ id: trip.id });
    expect(fresh.seatsBooked).toBe(10);
    expect(fresh.status).toBe('FULL');
    const [{ n }] = await db.query("SELECT COUNT(*) AS n FROM bookings WHERE trip_id = ? AND status <> 'CANCELLED'", [trip.id]);
    expect(Number(n)).toBe(10);
  });

  it('rejects a group larger than the seats left, with a helpful message', async () => {
    const trip = await createTrip(db, a.agency.id, a.destination.id, { capacity: 4 });
    await api().post('/api/bookings').set(auth(agentA)).send({ tripId: trip.id, customer: newCustomer(100), adults: 3 }).expect(201);
    const res = await api()
      .post('/api/bookings')
      .set(auth(agentA))
      .send({ tripId: trip.id, customer: newCustomer(101), adults: 2 })
      .expect(409);
    expect(res.body.message).toBe('Only 1 seat left on this trip; you requested 2.');
  });

  it('computes prices on the server, takes payments, auto-confirms at the deposit and blocks overpayment', async () => {
    const trip = await createTrip(db, a.agency.id, a.destination.id);
    const created = await api()
      .post('/api/bookings')
      .set(auth(agentA))
      .send({ tripId: trip.id, customer: newCustomer(200), adults: 2, children: 1, discount: '50.00' })
      .expect(201);
    const booking = created.body;
    expect(booking.totalAmount).toBe('1250.00'); // 2 x 500 + 1 x 300 - 50
    expect(booking.status).toBe('PENDING');
    expect(booking.passengers).toHaveLength(3);

    const overpay = await api()
      .post(`/api/bookings/${booking.id}/payments`)
      .set(auth(agentA))
      .send({ amount: '1250.01', method: 'CASH' })
      .expect(400);
    expect(overpay.body.message).toMatch(/remaining balance of 1250.00/);

    const deposit = await api()
      .post(`/api/bookings/${booking.id}/payments`)
      .set(auth(agentA))
      .send({ amount: '375.00', method: 'CASH' })
      .expect(201);
    expect(deposit.body.status).toBe('CONFIRMED'); // 30% deposit reached
    expect(deposit.body.paymentStatus).toBe('PARTIAL');
    expect(deposit.body.balance).toBe('875.00');

    const rest = await api()
      .post(`/api/bookings/${booking.id}/payments`)
      .set(auth(agentA))
      .send({ amount: '875.00', method: 'BANK_TRANSFER' })
      .expect(201);
    expect(rest.body.paymentStatus).toBe('PAID');
    expect(rest.body.balance).toBe('0.00');
  });

  it('cancelling releases the seats, reopens a full trip and refunds no more than was paid', async () => {
    const trip = await createTrip(db, a.agency.id, a.destination.id, { capacity: 2 });
    const res = await api()
      .post('/api/bookings')
      .set(auth(ownerA))
      .send({ tripId: trip.id, customer: newCustomer(300), adults: 2, payment: { amount: '300.00', method: 'CASH' } })
      .expect(201);
    expect((await db.getRepository(Trip).findOneByOrFail({ id: trip.id })).status).toBe('FULL');

    await api()
      .post(`/api/bookings/${res.body.id}/cancel`)
      .set(auth(ownerA))
      .send({ reason: 'Customer request', refund: { amount: '300.01', method: 'CASH' } })
      .expect(400);

    const cancelled = await api()
      .post(`/api/bookings/${res.body.id}/cancel`)
      .set(auth(ownerA))
      .send({ reason: 'Customer request', refund: { amount: '150.00', method: 'CASH' } })
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(cancelled.body.refundedAmount).toBe('150.00');
    expect(cancelled.body.paymentStatus).toBe('REFUNDED');

    const fresh = await db.getRepository(Trip).findOneByOrFail({ id: trip.id });
    expect(fresh.seatsBooked).toBe(0);
    expect(fresh.status).toBe('PUBLISHED');

    await api().post(`/api/bookings/${res.body.id}/cancel`).set(auth(ownerA)).send({ reason: 'again' }).expect(409);
  });

  it('keeps agencies isolated: another agency gets 404 for our booking and our trip', async () => {
    const trip = await createTrip(db, a.agency.id, a.destination.id);
    const res = await api()
      .post('/api/bookings')
      .set(auth(agentA))
      .send({ tripId: trip.id, customer: newCustomer(400), adults: 1 })
      .expect(201);

    await api().get(`/api/bookings/${res.body.id}`).set(auth(ownerB)).expect(404);
    await api().get(`/api/trips/${trip.id}`).set(auth(ownerB)).expect(404);
    await api()
      .post('/api/bookings')
      .set(auth(ownerB))
      .send({ tripId: trip.id, customer: newCustomer(401), adults: 1 })
      .expect(404);
    await api().post(`/api/bookings/${res.body.id}/payments`).set(auth(ownerB)).send({ amount: '10.00', method: 'CASH' }).expect(404);

    const list = await api().get('/api/bookings').set(auth(ownerB)).expect(200);
    expect(list.body.data.find((x: { id: string }) => x.id === res.body.id)).toBeUndefined();
  });

  it('rejects a forged agencyId in the body instead of trusting it', async () => {
    const trip = await createTrip(db, a.agency.id, a.destination.id);
    const res = await api()
      .post('/api/bookings')
      .set(auth(ownerB))
      .send({ tripId: trip.id, customer: newCustomer(500), adults: 1, agencyId: a.agency.id })
      .expect(400);
    expect(JSON.stringify(res.body.message)).toMatch(/agencyId should not exist/);
  });

  it('enforces roles: a booking agent cannot refund or read finance', async () => {
    const trip = await createTrip(db, a.agency.id, a.destination.id);
    const res = await api()
      .post('/api/bookings')
      .set(auth(agentA))
      .send({ tripId: trip.id, customer: newCustomer(600), adults: 1, payment: { amount: '100.00', method: 'CASH' } })
      .expect(201);
    await api()
      .post(`/api/bookings/${res.body.id}/refunds`)
      .set(auth(agentA))
      .send({ amount: '10.00', method: 'CASH', reason: 'test' })
      .expect(403);
    await api().get('/api/finance/summary').set(auth(agentA)).expect(403);
    await api().get('/api/bookings').expect(401);
  });

  it('public page: a traveller request holds seats as a pending booking and exposes no internal costs', async () => {
    const trip = await createTrip(db, a.agency.id, a.destination.id, { capacity: 5 });
    const page = await api().get(`/api/public/agencies/${a.agency.slug}`).expect(200);
    const card = page.body.trips.find((t: { slug: string }) => t.slug === trip.slug);
    expect(card.seatsAvailable).toBe(5);
    expect(card.costPerPerson).toBeUndefined();

    const req = await api()
      .post(`/api/public/agencies/${a.agency.slug}/trips/${trip.slug}/booking-requests`)
      .send({ firstName: 'Sami', lastName: 'Online', phone: '+963 911 222 333', adults: 2 })
      .expect(201);
    expect(req.body.status).toBe('PENDING');
    expect(req.body.reference).toMatch(/^TOS-\d{2}-[A-Z0-9]{6}$/);
    expect((await db.getRepository(Trip).findOneByOrFail({ id: trip.id })).seatsBooked).toBe(2);

    await api().get('/api/public/agencies/does-not-exist').expect(404);
  });
});
