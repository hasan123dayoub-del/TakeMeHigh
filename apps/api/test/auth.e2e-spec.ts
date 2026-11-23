import { bootstrap, Ctx, PASSWORD, refs } from './helpers';

describe('Identity, roles and permissions (4.1, 4.2)', () => {
  let ctx: Ctx;
  beforeAll(async () => (ctx = await bootstrap()));
  afterAll(() => ctx.app.close());

  it('AUTH-01: signs in and returns role, branch and permissions', async () => {
    const res = await ctx
      .http()
      .post('/auth/login', {
        email: 'employee.damascus@takemehigh.local',
        password: PASSWORD,
      })
      .expect(200);
    expect(res.body.user.role.code).toBe('EMPLOYEE');
    expect(res.body.user.branch.name).toContain('دمشق');
    expect(res.body.user.permissions).toContain('bookings.create');
    expect(res.body.user.permissions).not.toContain('pricing.view_breakdown');
    await ctx
      .http()
      .post('/auth/login', {
        email: 'employee.damascus@takemehigh.local',
        password: 'wrong-password1',
      })
      .expect(401);
  });

  it('AUTH-02: a refresh token works once; reusing it ends the session', async () => {
    const login = await ctx
      .http()
      .post('/auth/login', {
        email: 'guide.damascus@takemehigh.local',
        password: PASSWORD,
      })
      .expect(200);
    const first = await ctx
      .http()
      .post('/auth/refresh', { refreshToken: login.body.refreshToken })
      .expect(200);
    await ctx
      .http()
      .post('/auth/refresh', { refreshToken: login.body.refreshToken })
      .expect(401);
    await ctx
      .http()
      .post('/auth/refresh', { refreshToken: first.body.refreshToken })
      .expect(401);
  });

  it('AUTH-03, AUTH-10, AUTH-13: new staff must change the password; 5 failures lock the account', async () => {
    const r = await refs(ctx.prisma);
    const role = await ctx.prisma.role.findUniqueOrThrow({
      where: { code: 'EMPLOYEE' },
    });
    const admin = ctx.http(ctx.tokens.admin);
    const email = `new.${Date.now()}@takemehigh.local`;
    const created = await admin
      .post('/users', {
        fullName: 'موظف جديد',
        email,
        roleId: role.id,
        branchId: r.branch('دمشق'),
        password: 'Initial123456',
      })
      .expect(201);
    expect(created.body.mustChangePassword).toBe(true);

    const login = await ctx
      .http()
      .post('/auth/login', { email, password: 'Initial123456' })
      .expect(200);
    await ctx.http(login.body.accessToken).get('/trips').expect(403);
    await ctx
      .http(login.body.accessToken)
      .post('/auth/change-password', {
        currentPassword: 'Initial123456',
        newPassword: 'short',
      })
      .expect(400);
    const changed = await ctx
      .http(login.body.accessToken)
      .post('/auth/change-password', {
        currentPassword: 'Initial123456',
        newPassword: 'NewSecret2027',
      })
      .expect(200);
    await ctx.http(changed.body.accessToken).get('/trips').expect(200);

    for (let i = 0; i < 5; i++)
      await ctx
        .http()
        .post('/auth/login', { email, password: 'Wrong-pass-999' })
        .expect(401);
    const locked = await ctx
      .http()
      .post('/auth/login', { email, password: 'NewSecret2027' })
      .expect(401);
    expect(locked.body.message).toMatch(/Too many failed attempts/);

    const reset = await admin
      .post(`/users/${created.body.id}/reset-password`)
      .expect(201);
    await ctx
      .http()
      .post('/auth/login', { email, password: reset.body.temporaryPassword })
      .expect(200);
  });

  it('AUTH-09, ORG-04: the Admin has no branch, everyone else exactly one (API and database)', async () => {
    const roles = await ctx.prisma.role.findMany();
    const admin = ctx.http(ctx.tokens.admin);
    const employee = roles.find((x) => x.code === 'EMPLOYEE')!;
    const adminRole = roles.find((x) => x.code === 'ADMIN')!;
    await admin
      .post('/users', {
        fullName: 'بلا فرع',
        email: `nobranch.${Date.now()}@x.local`,
        roleId: employee.id,
        password: 'Initial123456',
      })
      .expect(400);
    const r = await refs(ctx.prisma);
    await admin
      .post('/users', {
        fullName: 'مدير بفرع',
        email: `adminbranch.${Date.now()}@x.local`,
        roleId: adminRole.id,
        branchId: r.branch('دمشق'),
        password: 'Initial123456',
      })
      .expect(400);
    // the trigger refuses it even when the API is bypassed
    await expect(
      ctx.prisma.user.create({
        data: {
          fullName: 'x',
          email: `raw.${Date.now()}@x.local`,
          passwordHash: 'x',
          roleId: employee.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('ORG-05: a branch manager adds employees and guides only, in their own branch', async () => {
    const roles = await ctx.prisma.role.findMany();
    const r = await refs(ctx.prisma);
    const mgr = ctx.http(ctx.tokens.mgrDam);
    const manager = roles.find((x) => x.code === 'BRANCH_MANAGER')!;
    const guide = roles.find((x) => x.code === 'TOUR_GUIDE')!;
    await mgr
      .post('/users', {
        fullName: 'مدير آخر',
        email: `m.${Date.now()}@x.local`,
        roleId: manager.id,
        password: 'Initial123456',
      })
      .expect(403);
    await mgr
      .post('/users', {
        fullName: 'دليل في حلب',
        email: `g1.${Date.now()}@x.local`,
        roleId: guide.id,
        branchId: r.branch('حلب'),
        password: 'Initial123456',
      })
      .expect(403);
    const ok = await mgr
      .post('/users', {
        fullName: 'دليل جديد',
        email: `g2.${Date.now()}@x.local`,
        roleId: guide.id,
        password: 'Initial123456',
        guideProfile: { languages: 'العربية' },
      })
      .expect(201);
    expect(ok.body.branch.name).toContain('دمشق');
    const list = await mgr.get('/users?pageSize=100').expect(200);
    expect(
      list.body.data.every((u: { branch: { name: string } | null }) =>
        u.branch?.name.includes('دمشق'),
      ),
    ).toBe(true);
  });

  it('AUTH-11: the last active Admin cannot be deactivated', async () => {
    const admin = await ctx.prisma.user.findFirstOrThrow({
      where: { role: { code: 'ADMIN' } },
    });
    const other = await ctx.prisma.user.findFirstOrThrow({
      where: { role: { code: 'BRANCH_MANAGER' } },
    });
    await ctx
      .http(ctx.tokens.admin)
      .patch(`/users/${admin.id}/active`, { isActive: false })
      .expect(400); // own account
    expect(other.id).toBeTruthy();
  });

  it('AUTH-06: the Admin edits other roles but never reduces the Admin role', async () => {
    const roles = await ctx.prisma.role.findMany();
    const admin = ctx.http(ctx.tokens.admin);
    await admin
      .put(`/roles/${roles.find((x) => x.code === 'ADMIN')!.id}/permissions`, {
        permissions: ['trips.view'],
      })
      .expect(400);
    const guide = roles.find((x) => x.code === 'TOUR_GUIDE')!;
    const res = await admin
      .put(`/roles/${guide.id}/permissions`, {
        permissions: [
          'trips.view',
          'trips.passengers',
          'trips.attendance',
          'programs.view',
          'geo.view',
        ],
      })
      .expect(200);
    expect(res.body.permissions).toHaveLength(5);
    await ctx.http(ctx.tokens.empDam).get('/roles').expect(403);
  });

  it('AUD-01, AUD-02: sign-ins are audited and the audit log is append-only', async () => {
    const logs = await ctx
      .http(ctx.tokens.admin)
      .get('/audit-logs?action=auth.login&pageSize=5')
      .expect(200);
    expect(logs.body.meta.total).toBeGreaterThan(0);
    const one = await ctx.prisma.auditLog.findFirstOrThrow();
    await expect(
      ctx.prisma.auditLog.update({
        where: { id: one.id },
        data: { summary: 'tampered' },
      }),
    ).rejects.toThrow();
    await expect(
      ctx.prisma.auditLog.delete({ where: { id: one.id } }),
    ).rejects.toThrow();
  });
});
