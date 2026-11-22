/**
 * Creates the TravelOS database on the local MySQL / MariaDB server (XAMPP) if it does not exist.
 * Usage: npm run db:create
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { createConnection } from 'mysql2/promise';

loadEnv({ path: resolve(__dirname, '../../../../.env'), quiet: true });

async function main() {
  const name = process.env.DB_NAME ?? 'travelos';
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Invalid DB_NAME "${name}"`);

  const conn = await createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
  }).catch((err: Error) => {
    console.error(
      `\nCannot reach MySQL at ${process.env.DB_HOST}:${process.env.DB_PORT}.` +
        `\nStart MySQL from the XAMPP Control Panel, then run this again.\n(${err.message})\n`,
    );
    process.exit(1);
  });

  const [rows] = await conn.query('SELECT VERSION() AS version');
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  console.log(`Database "${name}" is ready on ${(rows as { version: string }[])[0].version}`);
  await conn.end();
}

void main();
