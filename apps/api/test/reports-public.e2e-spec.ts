import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { ACCOUNTS, bearer, createApp, login } from './helpers';

describe('Dashboard, reports, public pages and integration settings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());
  let admin: string;
  let damascus: string;
  let aleppo: string;
  let coast: string;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    admin = (await login(app, ACCOUNTS.shamAdmin)).accessToken;
    damascus = (await login(app, ACCOUNTS.shamReceptionDamascus)).accessToken;
    aleppo = (await login(app, ACCOUNTS.shamReceptionAleppo)).accessToken;
    coast = (await login(app, ACCOUNTS.coastAdmin)).accessToken;
  });
  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------- dashboard

  it('dashboard: money per currency (never mixed) for Admin; no finance for Reception', async () => {
    const a = await api().get('/api/dashboard').set(bearer(admin)).expect(200);
    expect(a.body.kpis.upcomingTrips).toBeGreaterThan(0);
    const currencies = a.body.finance.collectedTotal.map((c: { currencyCode: string }) => c.currencyCode).sort();
    expect(currencies).toEqual(['SYP', 'USD']);
    for (const e of a.body.finance.expectedProfit) {
      expect(Number(e.profit)).toBeCloseTo(Number(e.revenue) - Number(e.supplierCost), 2);
    }
    const r = await api().get('/api/dashboard').set(bearer(damascus)).expect(200);
    expect(r.body.finance).toBeNull();
    expect(r.body.recentActivity).toEqual([]);
  });

  // ---------------------------------------------------------------- reports

  it('reports: operational reports for Reception, financial ones only for Admin', async () => {
    await api().get('/api/reports/bookings').set(bearer(damascus)).expect(200);
    await api().get('/api/reports/upcoming-trips').set(bearer(damascus)).expect(200);
    await api().get('/api/reports/trip-profit').set(bearer(damascus)).expect(403);
    await api().get('/api/reports/payments').set(bearer(damascus)).expect(403);
    await api().get('/api/reports/unknown').set(bearer(admin)).expect(400);
  });

  it('trip profit report separates expected profit, collected cash and realised profit', async () => {
    const res = await api().get('/api/reports/trip-profit').set(bearer(admin)).expect(200);
    const bosra = res.body.rows.find((r: { code: string }) => r.code === 'BS-01');
    // Bosra: 25 passengers × (178,500 − 150,000) = 712,500 expected profit; suppliers fully paid
    expect(bosra).toMatchObject({ status: 'COMPLETED', passengers: 25, revenue: '4462500.00', supplierCost: '3750000.00', expectedProfit: '712500.00', paidToSuppliers: '3750000.00' });
    expect(bosra.realisedProfit).toBe('712500.00');
    expect(res.body.totals.map((t: { currency: string }) => t.currency).sort()).toEqual(['SYP', 'USD']);
  });

  it('passenger list is per trip and respects branch isolation', async () => {
    const coastStd = await prisma.trip.findFirstOrThrow({ where: { code: 'DL-STD-01' } });
    await api().get('/api/reports/passengers').set(bearer(admin)).expect(400);
    const list = await api().get(`/api/reports/passengers?tripId=${coastStd.id}`).set(bearer(admin)).expect(200);
    expect(list.body.rows.length).toBeGreaterThanOrEqual(coastStd.confirmedSeats);
    await api().get(`/api/reports/passengers?tripId=${coastStd.id}`).set(bearer(aleppo)).expect(404);
  });

  it('customer account statement ends at the outstanding balance', async () => {
    const booking = await prisma.booking.findFirstOrThrow({ where: { status: 'CONFIRMED', currencyCode: 'SYP', paidAmount: { gt: 0 } } });
    const res = await api().get(`/api/reports/customer-statement?customerId=${booking.customerId}`).set(bearer(admin)).expect(200);
    const profile = await api().get(`/api/customers/${booking.customerId}`).set(bearer(admin)).expect(200);
    const syp = profile.body.statement.find((s: { currencyCode: string }) => s.currencyCode === 'SYP');
    expect(res.body.totals.find((t: { currency: string }) => t.currency === 'SYP').balance).toBe(syp.outstanding);
  });

  it('exports a real Excel file', async () => {
    const res = await api().get('/api/reports/bookings?format=xlsx&lang=ar').set(bearer(admin)).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    }).expect(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toMatch(/safarni-bookings-.*\.xlsx/);
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK'); // xlsx is a zip container
  });

  // ---------------------------------------------------------------- public pages

  it('showcase: public, only published open trips of participating offices, no internal data', async () => {
    const res = await api().get('/api/public/showcase').expect(200);
    const codes = res.body.data.map((t: { code: string }) => t.code);
    expect(codes).toEqual(expect.arrayContaining(['DL-STD-01', 'DL-VIP-01', 'AR-01']));
    expect(codes).not.toContain('ALP-02'); // draft
    expect(codes).not.toContain('WN-01'); // not public
    const raw = JSON.stringify(res.body);
    for (const secret of ['costPerPerson', 'profitPercent', 'unitCost', 'supplierId', 'passwordHash', 'officeId', 'branchId']) {
      expect(raw).not.toContain(secret);
    }
    const std = res.body.data.find((t: { code: string }) => t.code === 'DL-STD-01');
    expect(std).toMatchObject({ price: '957500.00', priceAfterOffer: '861750.00', office: { slug: 'sham-travel', whatsapp: '963944123456' } });
    expect(std.whatsappUrl).toMatch(/^https:\/\/wa\.me\/963944123456\?text=/);
    expect(decodeURIComponent(std.whatsappUrl)).toContain('DL-STD-01');
    expect(res.body.banners.length).toBeGreaterThan(0);
    expect(res.body.facets.destinations).toEqual(expect.arrayContaining(['اللاذقية']));
  });

  it('showcase filters: offers only, trip type, destination', async () => {
    const offers = await api().get('/api/public/showcase?offersOnly=true').expect(200);
    expect(offers.body.data.every((t: { offer: unknown }) => t.offer)).toBe(true);
    const vip = await api().get('/api/public/showcase?tripType=VIP').expect(200);
    expect(vip.body.data.every((t: { tripType: string }) => t.tripType === 'VIP')).toBe(true);
    const dest = await api().get(`/api/public/showcase?destination=${encodeURIComponent('طرطوس')}`).expect(200);
    expect(dest.body.data.map((t: { code: string }) => t.code)).toEqual(['AR-01']);
  });

  it('office page has location and trips; a disabled page answers 404', async () => {
    const page = await api().get('/api/public/offices/sham-travel').expect(200);
    expect(page.body.office.location).toEqual({ latitude: 33.5138, longitude: 36.2765 });
    expect(page.body.office.branches).toHaveLength(2);
    const trip = page.body.trips[0];
    const detail = await api().get(`/api/public/offices/sham-travel/trips/${trip.id}`).expect(200);
    expect(detail.body.itinerary.length).toBeGreaterThan(0);

    await api().patch('/api/office').set(bearer(coast)).send({ publicPageEnabled: false }).expect(200);
    await api().get('/api/public/offices/coast-tours').expect(404);
    const showcase = await api().get('/api/public/showcase').expect(200);
    expect(showcase.body.data.map((t: { code: string }) => t.code)).not.toContain('AR-01');
    await api().patch('/api/office').set(bearer(coast)).send({ publicPageEnabled: true }).expect(200);
  });

  // ---------------------------------------------------------------- integrations

  it('integration settings: Admin only, never secrets, restaurants manual, honest health state', async () => {
    const hotel = await prisma.supplier.findFirstOrThrow({ where: { type: 'HOTEL', office: { slug: 'sham-travel' } } });
    const restaurant = await prisma.supplier.findFirstOrThrow({ where: { type: 'RESTAURANT', office: { slug: 'sham-travel' } } });

    await api().get(`/api/suppliers/${hotel.id}/integration`).set(bearer(damascus)).expect(403);
    await api().get(`/api/suppliers/${hotel.id}/integration`).set(bearer(coast)).expect(404);
    await api().put(`/api/suppliers/${restaurant.id}/integration`).set(bearer(admin)).send({ baseUrl: 'https://x.test' }).expect(400);
    await api().put(`/api/suppliers/${hotel.id}/integration`).set(bearer(admin)).send({ credentialRef: 'sk_live_123' }).expect(400);

    const saved = await api()
      .put(`/api/suppliers/${hotel.id}/integration`)
      .set(bearer(admin))
      .send({ baseUrl: 'https://hotel-system.example/api', credentialRef: 'HOTEL_API_KEY_SHAM', externalSupplierId: 'H-42' })
      .expect(200);
    expect(saved.body).toMatchObject({ status: 'CONFIGURED', credentialRef: 'HOTEL_API_KEY_SHAM' });

    const health = await api().post(`/api/suppliers/${hotel.id}/integration/health`).set(bearer(admin)).expect(200);
    expect(health.body).toMatchObject({ ok: false, status: 'NOT_CONFIGURED' });
  });
});
