import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();

  const port = Number(app.get(ConfigService).get('API_PORT', 3001));
  await app.listen(port);
  Logger.log(
    `API ready on http://localhost:${port}/api  (docs: /api/docs)`,
    'Bootstrap',
  );
}
void bootstrap();
