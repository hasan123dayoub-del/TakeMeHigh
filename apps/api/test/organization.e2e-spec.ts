import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ACCOUNTS, bearer, createApp, login } from './helpers';

describe('Offices, branches, employees and roles: isolation and permissions (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  let shamAdmin: string;
  let shamAleppo: string;
  let coastAdmin: string;
  let platform: string;
  let shamAdminMemberId: string;

  beforeAll(async () => {
    ({ app } = await createApp());
    shamAdmin = (await login(app, ACCOUNTS.shamAdmin)).accessToken;
    shamAleppo = (await login(app, ACCOUNTS.shamReceptionAleppo)).accessToken;
    coastAdmin = (await login(app, ACCOUNTS.coastAdmin)).accessToken;
    platform = (await login(app, ACCOUNTS.platform)).accessToken;
    const me = await api().get('/api/employees').set(bearer(shamAdmin)).expect(200);
    shamAdminMemberId = me.body.find((m: { user: { email: string } }) => m.user.email === ACCOUNTS.shamAdmin).id;
  });
  afterAll(async () => {
    await app.close();
  });

  it('each office only ever sees its own office and branches', async () => {
    const sham = await api().get('/api/office').set(bearer(shamAdmin)).expect(200);
    const coast = await api().get('/api/office').set(bearer(coastAdmin)).expect(200);
    expect(sham.body.slug).toBe('sham-travel');
    expect(coast.body.slug).toBe('coast-tours');

    const coastBranches = await api().get('/api/branches').set(bearer(coastAdmin)).expect(200);
    expect(coastBranches.body.map((b: { name: string }) => b.name)).toEqual(['فرع اللاذقية']);
  });

  it('another office gets 404 when targeting our branch, even as an admin', async () => {
    const shamBranches = await api().get('/api/branches').set(bearer(shamAdmin)).expect(200);
    await api().patch(`/api/branches/${shamBranches.body[0].id}`).set(bearer(coastAdmin)).send({ name: 'hijacked' }).expect(404);
  });

  it('an admin cannot place an employee in another office\'s branch', async () => {
    const shamBranches = await api().get('/api/branches').set(bearer(shamAdmin)).expect(200);
    const coastRoles = await api().get('/api/roles').set(bearer(coastAdmin)).expect(200);
    await api()
      .post('/api/employees')
      .set(bearer(coastAdmin))
      .send({ fullName: 'Intruder', email: 'intruder@test.local', password: 'Abcdefg123', branchId: shamBranches.body[0].id, roleId: coastRoles.body[0].id })
      .expect(400);
  });

  it('Reception is limited to its own branch and cannot manage staff', async () => {
    const branches = await api().get('/api/branches').set(bearer(shamAleppo)).expect(200);
    expect(branches.body).toHaveLength(1);
    expect(branches.body[0].name).toBe('فرع حلب');
    await api().get('/api/employees').set(bearer(shamAleppo)).expect(403);
    await api().patch('/api/office').set(bearer(shamAleppo)).send({ name: 'x' }).expect(403);
    await api().post('/api/branches').set(bearer(shamAleppo)).send({ name: 'x branch' }).expect(403);
  });

  it('employee lists never leak across offices', async () => {
    const sham = await api().get('/api/employees').set(bearer(shamAdmin)).expect(200);
    const coast = await api().get('/api/employees').set(bearer(coastAdmin)).expect(200);
    const shamEmails: string[] = sham.body.map((m: { user: { email: string } }) => m.user.email);
    const coastEmails: string[] = coast.body.map((m: { user: { email: string } }) => m.user.email);
    expect(shamEmails).toHaveLength(3);
    expect(coastEmails.every((e) => e.endsWith('@coast-tours.safarni.local'))).toBe(true);
    expect(shamEmails.some((e) => coastEmails.includes(e))).toBe(false);
  });

  it('roles: branch-level roles cannot hold office-wide permissions; custom roles can be created and deleted', async () => {
    await api().post('/api/roles').set(bearer(shamAdmin)).send({ name: 'Bad', scope: 'BRANCH', permissions: ['employees.manage'] }).expect(400);
    const created = await api()
      .post('/api/roles')
      .set(bearer(shamAdmin))
      .send({ name: 'Trip supervisor', scope: 'BRANCH', permissions: ['trips.view', 'trips.supervise'] })
      .expect(201);
    await api().delete(`/api/roles/${created.body.id}`).set(bearer(shamAdmin)).expect(200);
    const roles = await api().get('/api/roles').set(bearer(shamAdmin)).expect(200);
    const system = roles.body.find((r: { isSystem: boolean }) => r.isSystem);
    await api().delete(`/api/roles/${system.id}`).set(bearer(shamAdmin)).expect(409);
  });

  it('an admin cannot deactivate themself or strip the last admin role', async () => {
    await api().patch(`/api/employees/${shamAdminMemberId}`).set(bearer(shamAdmin)).send({ isActive: false }).expect(400);
    const roles = await api().get('/api/roles').set(bearer(shamAdmin)).expect(200);
    const adminRole = roles.body.find((r: { name: string }) => r.name === 'Admin');
    await api().patch(`/api/roles/${adminRole.id}`).set(bearer(shamAdmin)).send({ permissions: ['trips.view'] }).expect(409);
  });

  it('platform administration is separate from office administration', async () => {
    const offices = await api().get('/api/platform/offices').set(bearer(platform)).expect(200);
    expect(offices.body.map((o: { slug: string }) => o.slug)).toEqual(expect.arrayContaining(['sham-travel', 'coast-tours']));
    await api().get('/api/platform/offices').set(bearer(shamAdmin)).expect(403);
    await api().get('/api/office').set(bearer(platform)).expect(403);
  });
});
