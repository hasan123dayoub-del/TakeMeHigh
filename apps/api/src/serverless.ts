/**
 * Entry point for serverless hosting (Vercel). main.ts starts a long-running server; here one
 * Nest app is created per warm instance and every request is handed to its Express adapter.
 *
 * Background jobs: set DISABLE_SCHEDULER=true there. Registration deadlines are already applied
 * on reads (LifecycleService.runDue), and a Vercel Cron calls /api/cron/nightly to sync suppliers.
 */
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { timingSafeEqual } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { IntegrationsService } from './integrations/integrations.module';
import { LifecycleService } from './products/lifecycle.service';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let ready: Promise<{ app: NestExpressApplication; handle: Handler }> | null =
  null;

async function create() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],
  });
  configureApp(app);
  await app.init();
  return { app, handle: app.getHttpAdapter().getInstance() as Handler };
}

/** Bearer token check that takes the same time whether the secret is right or wrong. */
function authorized(header: string | undefined) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  ready ??= create().catch((err) => {
    ready = null; // try again on the next request
    throw err;
  });
  let app: NestExpressApplication;
  let handle: Handler;
  try {
    ({ app, handle } = await ready);
  } catch (err) {
    console.error(err);
    return json(res, 503, { message: 'Service unavailable, try again' });
  }

  // Vercel Cron, once a day: supplier sync (INT-04) and registration deadlines (CLS-02)
  if ((req.url ?? '').split('?')[0] === '/api/cron/nightly') {
    if (!authorized(req.headers.authorization))
      return json(res, 401, { message: 'Unauthorized' });
    await app.get(LifecycleService).runDue(true);
    await app.get(IntegrationsService).syncDue();
    return json(res, 200, { ok: true });
  }

  handle(req, res);
}
