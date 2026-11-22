import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/** Shared by main.ts and the e2e tests so tests exercise the exact production pipeline. */
export function configureApp(app: INestApplication, { swagger = true } = {}) {
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // ...and reject requests that try to send them (e.g. a forged agencyId)
      transform: true,
    }),
  );

  if (swagger) {
    const doc = new DocumentBuilder()
      .setTitle('TravelOS API')
      .setDescription(
        'Operations platform for travel agencies: trips & offers, bookings with live seat availability, ' +
          'customers, hotel and transport suppliers, payments, expenses and reports. ' +
          'Sign in with POST /api/auth/login, then click "Authorize" and paste the accessToken.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc), {
      swaggerOptions: { persistAuthorization: true },
      customSiteTitle: 'TravelOS API docs',
    });
  }
  return app;
}
