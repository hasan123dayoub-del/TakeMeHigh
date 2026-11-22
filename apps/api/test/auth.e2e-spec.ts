import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ACCOUNTS, bearer, createApp, login, PASSWORD } from './helpers';

describe('Authentication (e2e, real PostgreSQL)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createApp());
  });
  afterAll(async () => {
    await app.close();
  });

  it('signs an Admin in with office-wide scope and every permission', async () => {
    const { accessToken, refreshToken, user } = await login(app, ACCOUNTS.shamAdmin);
    expect(accessToken.split('.')).toHaveLength(3);
    expect(refreshToken.length).toBeGreaterThanOrEqual(60);
    expect(user.role?.scope).toBe('OFFICE');
    expect(user.permissions).toEqual(expect.arrayContaining(['refunds.record', 'employees.manage', 'reports.financial']));
  });

  it('signs a Reception user in limited to their branch, without admin permissions', async () => {
    const { user } = await login(app, ACCOUNTS.shamReceptionAleppo);
    expect(user.role?.scope).toBe('BRANCH');
    expect(user.branch).not.toBeNull();
    expect(user.permissions).toEqual(expect.arrayContaining(['bookings.create', 'payments.record']));
    expect(user.permissions).not.toContain('refunds.record');
    expect(user.permissions).not.toContain('employees.manage');
    expect(user.permissions).not.toContain('reports.financial');
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await api().post('/api/auth/login').send({ email: ACCOUNTS.shamAdmin, password: 'not-the-password' }).expect(401);
    const unknown = await api().post('/api/auth/login').send({ email: 'nobody@nowhere.local', password: PASSWORD }).expect(401);
    expect(wrong.body.message).toBe('Invalid email or password');
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('protects routes: no token 401, valid token returns the profile', async () => {
    await api().get('/api/auth/me').expect(401);
    await api().get('/api/auth/me').set(bearer('not.a.jwt')).expect(401);
    const { accessToken } = await login(app, ACCOUNTS.shamReceptionDamascus);
    const me = await api().get('/api/auth/me').set(bearer(accessToken)).expect(200);
    expect(me.body.email).toBe(ACCOUNTS.shamReceptionDamascus);
    expect(me.body.office.slug).toBe('sham-travel');
  });

  it('rotates refresh tokens: each works once, and reusing an old one revokes the whole session', async () => {
    const first = await login(app, ACCOUNTS.shamAdmin);

    const second = await api().post('/api/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200);
    expect(second.body.refreshToken).not.toBe(first.refreshToken);
    expect(second.body.accessToken).toBeTruthy();

    // Replaying the first (already used) token = theft signal → family revoked
    await api().post('/api/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
    // ...so even the newest token of that session no longer works
    await api().post('/api/auth/refresh').send({ refreshToken: second.body.refreshToken }).expect(401);
  });

  it('logout revokes the session', async () => {
    const s = await login(app, ACCOUNTS.coastAdmin);
    await api().post('/api/auth/logout').send({ refreshToken: s.refreshToken }).expect(200);
    await api().post('/api/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
  });

  it('platform admins have no office context', async () => {
    const { user } = await login(app, ACCOUNTS.platform);
    expect(user.office).toBeNull();
    expect(user.permissions).toEqual([]);
  });

  it('rejects unknown body fields (e.g. a forged officeId)', async () => {
    await api().post('/api/auth/login').send({ email: ACCOUNTS.shamAdmin, password: PASSWORD, officeId: 'x' }).expect(400);
  });
});
