import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import {
  PUBLIC_DIR,
  StorageService,
  filesInDatabase,
} from './uploads/uploads.module';

/** Shared by main.ts and the e2e tests so tests exercise the exact production pipeline. */
export function configureApp(app: INestApplication, { swagger = true } = {}) {
  const config = app.get(ConfigService);

  // Public images are embedded by the web app on another origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGIN', 'http://localhost:3000')
      .split(','),
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });
  if (filesInDatabase()) {
    // Public images come from the stored_files table (serverless hosting has no lasting disk)
    const storage = app.get(StorageService);
    app.use(
      '/uploads',
      (
        req: { method: string; path: string },
        res: {
          status(code: number): { end(): void };
          set(headers: Record<string, string>): { send(body: Buffer): void };
        },
        next: (err?: unknown) => void,
      ) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        let key: string;
        try {
          key = `public${decodeURIComponent(req.path)}`;
        } catch {
          return res.status(400).end();
        }
        storage
          .readFromDatabase(key)
          .then((file) => {
            if (!file) return res.status(404).end();
            res
              .set({
                'Content-Type': file.mime,
                'Cache-Control': 'public, max-age=2592000, immutable',
              })
              .send(file.data);
          })
          .catch(() => res.status(404).end());
      },
    );
  } else {
    mkdirSync(PUBLIC_DIR, { recursive: true });
    (app as NestExpressApplication).useStaticAssets(PUBLIC_DIR, {
      prefix: '/uploads/',
      maxAge: '30d',
      index: false,
      dotfiles: 'deny',
    });
  }
  (app as NestExpressApplication).set('trust proxy', 'loopback');
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // ...and reject requests that try to send them
      transform: true,
    }),
  );

  if (swagger) {
    const doc = new DocumentBuilder()
      .setTitle('TakeMeHigh API')
      .setDescription(
        'TakeMeHigh: operations system for one travel agency (single-tenant). Branches, staff and roles; ' +
          'countries, cities and categories; services, companies and supplier integrations; trips built from priced services, ' +
          'programs chaining trips, offers; customers with documents, bookings with passengers and live seats, visas, ' +
          'payments with PDF receipts; registration closing; statistics; the public landing page and custom trip requests. ' +
          'Requirement ids (e.g. TRP-05) refer to docs/srs/takemehigh. Sign in with POST /api/auth/login, then Authorize with the accessToken.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, doc),
      {
        swaggerOptions: { persistAuthorization: true },
        customSiteTitle: 'TakeMeHigh API docs',
      },
    );
  }
  return app;
}
