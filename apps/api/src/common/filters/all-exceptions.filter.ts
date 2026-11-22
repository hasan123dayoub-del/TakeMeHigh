import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

/**
 * One error shape for the whole API: { statusCode, error, message, path, timestamp }.
 * Database and unexpected errors never leak SQL or stack traces to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Something went wrong. Please try again.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with the same unique value already exists.';
          break;
        case 'P2003':
        case 'P2014':
          status = HttpStatus.CONFLICT;
          message =
            'This record is linked to other records and cannot be changed or deleted.';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        default:
          this.logger.error(`${exception.code}: ${exception.message}`);
      }
    } else if (
      exception instanceof Prisma.PrismaClientUnknownRequestError &&
      /violates check constraint "([a-z_]+)"/.test(exception.message)
    ) {
      // Database business guards (e.g. chk_trips_seats) are a second safety net behind the services.
      status = HttpStatus.CONFLICT;
      message =
        'This change would break a business rule (capacity or amount limits).';
      this.logger.warn(exception.message);
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
