import { Injectable, Logger } from '@nestjs/common';
import type { IntegrationOperation } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterContext, IntegrationError } from './integration.types';

export interface IntegrationRequest {
  operation: IntegrationOperation;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Path relative to the integration baseUrl. Logged without the query string. */
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /**
   * Retries are only safe for reads, or for writes the provider documents as idempotent.
   * Default: reads retry, writes never retry.
   */
  retry?: boolean;
  externalReservationId?: string;
}

const READS: IntegrationOperation[] = ['HEALTH', 'SEARCH', 'DETAILS', 'AVAILABILITY', 'PRICING', 'GET_RESERVATION'];
const MAX_ATTEMPTS = 3;

/**
 * Shared HTTP layer for every supplier adapter: timeouts, safe retries with backoff (honouring
 * Retry-After), error mapping and an integration log entry per attempt (metadata only: no bodies,
 * no credentials, no passenger data).
 */
@Injectable()
export class IntegrationHttpClient {
  private readonly logger = new Logger('Integrations');

  constructor(private readonly prisma: PrismaService) {}

  async request<T>(ctx: AdapterContext, req: IntegrationRequest): Promise<T> {
    const canRetry = req.retry ?? READS.includes(req.operation);
    const url = new URL(req.path, ctx.baseUrl.endsWith('/') ? ctx.baseUrl : `${ctx.baseUrl}/`);

    for (let attempt = 1; ; attempt++) {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 10_000);
      try {
        const res = await fetch(url, {
          method: req.method,
          headers: { 'content-type': 'application/json', 'x-correlation-id': ctx.correlationId, ...req.headers },
          body: req.body === undefined ? undefined : JSON.stringify(req.body),
          signal: controller.signal,
        });
        await this.log(ctx, req, url, res.status, started, res.ok);

        if (res.ok) return (await res.json()) as T;
        const error = this.mapStatus(res.status, res.headers.get('retry-after'));
        if (canRetry && attempt < MAX_ATTEMPTS && ['RATE_LIMITED', 'UNAVAILABLE'].includes(error.code)) {
          await this.sleep(error.retryAfterMs ?? 300 * 2 ** attempt);
          continue;
        }
        throw error;
      } catch (e) {
        if (e instanceof IntegrationError) throw e;
        const timedOut = (e as Error).name === 'AbortError';
        await this.log(ctx, req, url, null, started, false, timedOut ? 'TIMEOUT' : 'NETWORK', (e as Error).message);
        if (canRetry && attempt < MAX_ATTEMPTS) {
          await this.sleep(300 * 2 ** attempt);
          continue;
        }
        // For writes this is an UNCERTAIN outcome; callers must mark the reservation UNKNOWN and reconcile.
        throw new IntegrationError(timedOut ? 'TIMEOUT' : 'UNAVAILABLE', timedOut ? 'Supplier did not answer in time' : 'Supplier system unreachable');
      } finally {
        clearTimeout(timer);
      }
    }
  }

  private mapStatus(status: number, retryAfter: string | null): IntegrationError {
    const retryAfterMs = retryAfter ? Math.min(Number(retryAfter) * 1000 || 1000, 30_000) : undefined;
    if (status === 401 || status === 403) return new IntegrationError('UNAUTHORIZED', 'Supplier rejected our credentials');
    if (status === 429) return new IntegrationError('RATE_LIMITED', 'Supplier rate limit reached', retryAfterMs);
    if (status >= 500) return new IntegrationError('UNAVAILABLE', `Supplier system error (${status})`, retryAfterMs);
    return new IntegrationError('REJECTED', `Supplier rejected the request (${status})`);
  }

  private async log(
    ctx: AdapterContext,
    req: IntegrationRequest,
    url: URL,
    statusCode: number | null,
    started: number,
    success: boolean,
    errorCode?: string,
    errorMessage?: string,
  ) {
    try {
      await this.prisma.integrationLog.create({
        data: {
          officeId: ctx.officeId,
          integrationId: ctx.integrationId,
          externalReservationId: req.externalReservationId,
          operation: req.operation,
          httpMethod: req.method,
          endpoint: url.pathname.slice(0, 200), // never the query string
          statusCode,
          durationMs: Date.now() - started,
          success,
          errorCode,
          errorMessage: errorMessage?.slice(0, 500),
          correlationId: ctx.correlationId,
        },
      });
    } catch (e) {
      this.logger.warn(`Could not write integration log: ${(e as Error).message}`);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
