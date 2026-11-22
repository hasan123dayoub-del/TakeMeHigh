import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';
import { SnakeNamingStrategy } from './naming.strategy';

// Single .env at the monorepo root, shared by the API, scripts and web.
loadEnv({ path: resolve(__dirname, '../../../../.env'), quiet: true });

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    // DECIMAL and BIGINT come back as strings: no float rounding on money.
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: ['DATE'],
    entities: ENTITIES,
    migrations: [resolve(__dirname, 'migrations/*.{ts,js}')],
    migrationsTableName: 'migrations',
    namingStrategy: new SnakeNamingStrategy(),
    // Schema is only ever changed through migrations.
    synchronize: false,
    migrationsRun: false,
    logging: process.env.DB_LOGGING === 'true' ? ['query', 'error'] : ['error'],
  };
}

export default new DataSource(buildDataSourceOptions());
