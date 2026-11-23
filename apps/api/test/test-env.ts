import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

/** The e2e database: the development URL with the database name suffixed by _test. */
export function testDatabaseUrl() {
  loadEnv({ path: resolve(__dirname, '../../../.env'), quiet: true });
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `${url.pathname.replace(/_test$/, '')}_test`;
  return url.toString();
}

/** Runs in every test worker before any module is imported. */
process.env.DATABASE_URL = testDatabaseUrl();
process.env.DISABLE_SCHEDULER = 'true';
process.env.SUPPLIER_SANDBOX = 'true';
process.env.DISABLE_THROTTLE = 'true';
