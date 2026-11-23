/**
 * Builds a fresh test database (takemehigh_test) before the e2e run: drop, create, migrate, seed.
 * The development database is never touched.
 */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import { testDatabaseUrl } from './test-env';

export default async function globalSetup() {
  loadEnv({ path: resolve(__dirname, '../../../.env'), quiet: true });
  const url = testDatabaseUrl();
  const name = new URL(url).pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();

  const env = { ...process.env, DATABASE_URL: url, DISABLE_SCHEDULER: 'true' };
  const cwd = resolve(__dirname, '..');
  execSync('npx prisma migrate deploy', { cwd, env, stdio: 'ignore' });
  execSync('npx tsx prisma/seed.ts', { cwd, env, stdio: 'ignore' });
}
