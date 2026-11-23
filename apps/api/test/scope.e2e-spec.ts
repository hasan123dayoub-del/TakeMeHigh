import { bootstrap, Ctx } from './helpers';

/** Every key that would reveal the price breakdown (PRC-06, PRC-07). */
const SECRET = /cost|profit|unitCost|sellingPrice/i;
function secretKeys(value: unknown, path = ''): string[] {
  if (Array.isArray(value))
    return value.flatMap((v, i) => secretKeys(v, `${path}[${i}]`));
  if (value && typeof value === 'object')
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([k, v]) => [
        ...(SECRET.test(k) && v !== undefined && v !== null
          ? [`${path}.${k}`]
          : []),
        ...secretKeys(v, `${path}.${k}`),
      ],
    );
  return [];
}

describe('Data scope and price confidentiality (AUTH-08, PRC-06, PRC-07)', () => {
  let ctx: Ctx;
  beforeAll(async () => (ctx = await bootstrap()));
  afterAll(() => ctx.app.close());

  it('a branch sees only its own bookings, and other branches’ ids answer 404', async () => {
    const aleppo = await ctx.prisma.branch.findFirstOrThrow({
      where: { name: { contains: 'حلب' } },
    });
    const list = await ctx
      .http(ctx.tokens.empAlp)
      .get('/bookings?pageSize=100')
      .expect(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    expect(
      list.body.data.every(
        (b: { branch: { id: string } }) => b.branch.id === aleppo.id,
      ),
    ).toBe(true);
    const damascusBooking = await ctx.prisma.booking.findFirstOrThrow({
      where: { branch: { name: { contains: 'دمشق' } } },
    });
    await ctx
      .http(ctx.tokens.empAlp)
      .get(`/bookings/${damascusBooking.id}`)
      .expect(404);
    await ctx
      .http(ctx.tokens.mgrAlp)
      .post(`/bookings/${damascusBooking.id}/cancel`, { reason: 'probe' })
      .expect(404);
    await ctx
      .http(ctx.tokens.admin)
      .get(`/bookings/${damascusBooking.id}`)
      .expect(200);
  });

  it('a branch sees its own and shared trips, never another branch’s', async () => {
    const res = await ctx
      .http(ctx.tokens.empDam)
      .get('/trips?pageSize=100')
      .expect(200);
    const aleppo = await ctx.prisma.branch.findFirstOrThrow({
      where: { name: { contains: 'حلب' } },
    });
    expect(
      res.body.data.some(
        (t: { branch: { id: string } | null }) => t.branch?.id === aleppo.id,
      ),
    ).toBe(false);
    expect(res.body.data.some((t: { branch: null }) => t.branch === null)).toBe(
      true,
    );
  });

  it('a tour guide sees only the trips assigned to them, and no bookings or customers', async () => {
    const guide = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: 'guide.damascus@takemehigh.local' },
    });
    const res = await ctx
      .http(ctx.tokens.guideDam)
      .get('/trips?pageSize=100')
      .expect(200);
    const assigned = await ctx.prisma.tripGuide.count({
      where: { userId: guide.id },
    });
    expect(res.body.meta.total).toBe(assigned);
    await ctx.http(ctx.tokens.guideDam).get('/bookings').expect(403);
    await ctx.http(ctx.tokens.guideDam).get('/customers').expect(403);
    const trip = res.body.data[0];
    const manifest = await ctx
      .http(ctx.tokens.guideDam)
      .get(`/trips/${trip.id}/passengers`)
      .expect(200);
    expect(manifest.body.total).toBeGreaterThan(0);
    const other = await ctx.prisma.trip.findFirstOrThrow({
      where: { guides: { none: { userId: guide.id } } },
    });
    await ctx.http(ctx.tokens.guideDam).get(`/trips/${other.id}`).expect(404);
  });

  it('only the Admin sees costs and profit; staff see the full price only', async () => {
    const trip = await ctx.prisma.trip.findFirstOrThrow({
      where: { status: 'OPEN', lines: { some: {} }, branchId: null },
    });
    const adminView = await ctx
      .http(ctx.tokens.admin)
      .get(`/trips/${trip.id}`)
      .expect(200);
    expect(adminView.body.costPerPerson).toBeDefined();
    expect(adminView.body.lines[0].profitValue).toBeDefined();
    for (const token of [ctx.tokens.mgrDam, ctx.tokens.empDam]) {
      const view = await ctx.http(token).get(`/trips/${trip.id}`).expect(200);
      expect(view.body.pricePerPerson).toBe(adminView.body.pricePerPerson);
      expect(secretKeys(view.body)).toEqual([]);
    }
    const catalog = await ctx
      .http(ctx.tokens.mgrDam)
      .get('/catalog')
      .expect(200);
    expect(
      catalog.body.every(
        (i: { costPerPerson: unknown }) => i.costPerPerson === null,
      ),
    ).toBe(true);
    await ctx.http(ctx.tokens.mgrDam).get('/stats').expect(403);
  });

  it('the public API never returns costs, profit or a breakdown', async () => {
    const pub = ctx.http();
    const [site, trips, programs, offers] = await Promise.all([
      pub.get('/public/site'),
      pub.get('/public/trips'),
      pub.get('/public/programs'),
      pub.get('/public/offers'),
    ]);
    for (const r of [site, trips, programs, offers]) {
      expect(r.status).toBe(200);
      expect(secretKeys(r.body)).toEqual([]);
    }
    const detail = await pub
      .get(`/public/trips/${trips.body.data[0].id}`)
      .expect(200);
    expect(secretKeys(detail.body)).toEqual([]);
    expect(
      trips.body.data.every(
        (t: { finalPrice: string }) => Number(t.finalPrice) > 0,
      ),
    ).toBe(true);
  });

  it('only public open trips appear on the landing page (LND-03)', async () => {
    const res = await ctx.http().get('/public/trips?pageSize=24').expect(200);
    const ids = res.body.data.map((t: { id: string }) => t.id);
    const rows = await ctx.prisma.trip.findMany({ where: { id: { in: ids } } });
    expect(
      rows.every(
        (t) =>
          t.isPublic &&
          t.status === 'OPEN' &&
          t.registrationDeadline > new Date(),
      ),
    ).toBe(true);
    const draft = await ctx.prisma.trip.findFirstOrThrow({
      where: { status: 'DRAFT' },
    });
    await ctx.http().get(`/public/trips/${draft.id}`).expect(404);
  });
});
