import { bootstrap, Ctx } from './helpers';

describe('Public landing page and custom requests (4.16 – 4.18)', () => {
  let ctx: Ctx;
  beforeAll(async () => (ctx = await bootstrap()));
  afterAll(() => ctx.app.close());

  const base = async () => {
    const options = await ctx.http().get('/public/request-options').expect(200);
    const byKind = (k: string) =>
      options.body.services.find((s: { kind: string }) => s.kind === k);
    const city = (en: string) =>
      options.body.cities.find((c: { nameEn: string }) => c.nameEn === en).id;
    const from = new Date(Date.now() + 20 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const to = new Date(Date.now() + 23 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return { byKind, city, from, to };
  };

  it('LND-02: the site endpoint carries every landing section', async () => {
    const res = await ctx.http().get('/public/site').expect(200);
    expect(res.body.office.whatsappNumber).toBeTruthy();
    for (const k of [
      'branches',
      'policies',
      'slides',
      'achievements',
      'categories',
    ])
      expect(res.body[k].length).toBeGreaterThan(0);
    const policy = await ctx
      .http()
      .get(`/public/policies/${res.body.policies[0].slug}`)
      .expect(200);
    expect(policy.body.body.length).toBeGreaterThan(10);
  });

  it('LND-04: trips can be filtered by trip type (category)', async () => {
    const site = await ctx.http().get('/public/site').expect(200);
    const religious = site.body.categories.find(
      (c: { nameEn: string }) => c.nameEn === 'Religious',
    );
    const leisure = site.body.categories.find(
      (c: { nameEn: string }) => c.nameEn === 'Leisure',
    );
    const res = await ctx
      .http()
      .get(`/public/trips?categoryId=${leisure.id}`)
      .expect(200);
    expect(
      res.body.data.every(
        (t: { category: { id: string } }) => t.category.id === leisure.id,
      ),
    ).toBe(true);
    const programs = await ctx
      .http()
      .get(`/public/programs?categoryId=${religious.id}`)
      .expect(200);
    expect(programs.body.data.length).toBeGreaterThan(0);
  });

  it('CTR-02..05: needs two services; "Other" needs text; transport needs a mode; valid requests reach the dashboard', async () => {
    const { byKind, city, from, to } = await base();
    const hotel = byKind('HOTEL');
    const transport = byKind('TRANSPORT');
    const restaurant = byKind('RESTAURANT');
    const common = {
      contactName: 'زائر تجريبي',
      contactPhone: '0944000999',
      passengersCount: 3,
      desiredFrom: from,
      desiredTo: to,
      originCityId: city('Damascus'),
      destinationCityId: city('Latakia'),
    };

    const one = await ctx
      .http()
      .post('/public/requests', {
        ...common,
        items: [
          { serviceId: hotel.id, companyId: hotel.companies[0].id },
          { serviceId: hotel.id, otherText: 'فندق آخر' },
        ],
      })
      .expect(400);
    expect(JSON.stringify(one.body.message)).toMatch(/two different services/);
    await ctx
      .http()
      .post('/public/requests', {
        ...common,
        items: [
          { serviceId: hotel.id },
          { serviceId: restaurant.id, companyId: restaurant.companies[0].id },
        ],
      })
      .expect(400);
    const land = transport.companies.find(
      (c: { transportMode: string }) => c.transportMode === 'LAND',
    );
    await ctx
      .http()
      .post('/public/requests', {
        ...common,
        items: [
          { serviceId: transport.id, companyId: land.id },
          { serviceId: hotel.id, companyId: hotel.companies[0].id },
        ],
      })
      .expect(400);
    await ctx
      .http()
      .post('/public/requests', {
        ...common,
        items: [
          { serviceId: transport.id, companyId: land.id, transportMode: 'SEA' },
          { serviceId: hotel.id, companyId: hotel.companies[0].id },
        ],
      })
      .expect(400);

    const ok = await ctx
      .http()
      .post('/public/requests', {
        ...common,
        items: [
          {
            serviceId: transport.id,
            companyId: land.id,
            transportMode: 'LAND',
          },
          { serviceId: hotel.id, otherText: 'فندق بإطلالة على البحر' },
          { serviceId: restaurant.id, companyId: restaurant.companies[0].id },
        ],
      })
      .expect(201);
    expect(ok.body.requestNo).toMatch(/^REQ-\d{4}-\d{4}$/);
    const list = await ctx
      .http(ctx.tokens.admin)
      .get(`/requests?search=${ok.body.requestNo}`)
      .expect(200);
    expect(
      list.body.data[0].items.some(
        (i: { otherText: string }) => i.otherText === 'فندق بإطلالة على البحر',
      ),
    ).toBe(true);
    const notes = await ctx
      .http(ctx.tokens.admin)
      .get('/notifications')
      .expect(200);
    expect(
      notes.body.items.some((i: { type: string }) => i.type === 'NEW_REQUESTS'),
    ).toBe(true);
  });

  it('CTR-05: the honeypot silently drops bots', async () => {
    const { byKind, city, from, to } = await base();
    const before = await ctx.prisma.customTripRequest.count();
    await ctx
      .http()
      .post('/public/requests', {
        contactName: 'bot',
        contactPhone: '0944000888',
        passengersCount: 1,
        desiredFrom: from,
        desiredTo: to,
        originCityId: city('Damascus'),
        destinationCityId: city('Aleppo'),
        website: 'http://spam',
        items: [
          { serviceId: byKind('HOTEL').id, otherText: 'x1' },
          { serviceId: byKind('RESTAURANT').id, otherText: 'x2' },
        ],
      })
      .expect(201);
    expect(await ctx.prisma.customTripRequest.count()).toBe(before);
  });

  it('CTR-06: the Admin assigns a request; the branch then sees it', async () => {
    const req = await ctx.prisma.customTripRequest.findFirstOrThrow({
      where: { assignedBranchId: null },
    });
    const aleppo = await ctx.prisma.branch.findFirstOrThrow({
      where: { name: { contains: 'حلب' } },
    });
    await ctx.http(ctx.tokens.empAlp).get(`/requests/${req.id}`).expect(404);
    await ctx
      .http(ctx.tokens.mgrAlp)
      .post(`/requests/${req.id}/assign`, { branchId: aleppo.id })
      .expect(403);
    await ctx
      .http(ctx.tokens.admin)
      .post(`/requests/${req.id}/assign`, { branchId: aleppo.id })
      .expect(200);
    await ctx.http(ctx.tokens.empAlp).get(`/requests/${req.id}`).expect(200);
  });

  it('CMS-06: only the Admin manages the landing content', async () => {
    await ctx
      .http(ctx.tokens.mgrDam)
      .post('/cms/policies', {
        slug: 'x-page',
        title: 'x',
        body: 'xxxxxxxxxxxx',
      })
      .expect(403);
    const created = await ctx
      .http(ctx.tokens.admin)
      .post('/cms/policies', {
        slug: 'faq',
        title: 'الأسئلة الشائعة',
        body: 'كيف أحجز؟ تواصل معنا على واتساب.',
      })
      .expect(201);
    await ctx.http().get('/public/policies/faq').expect(200);
    await ctx
      .http(ctx.tokens.admin)
      .delete(`/cms/policies/${created.body.id}`)
      .expect(200);
  });
});
