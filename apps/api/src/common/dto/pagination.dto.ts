import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Paginated } from '@travelos/shared';

/** Hard cap for exports (RPT-08): larger exports must be filtered first. */
export const EXPORT_LIMIT = 10_000;

/**
 * Server-side pagination, sorting and search shared by every list (RPT-03).
 * `export=xlsx` returns every matching row as an Excel file; `export=all` returns every
 * matching row as JSON (the web app's PDF print view). Both respect filters and scope (RPT-01).
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 25, enum: [10, 25, 50, 100] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @ApiPropertyOptional({ description: 'Free-text search' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field (each list documents its allowed fields)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    enum: ['xlsx', 'all'],
    description: 'xlsx = Excel download, all = every row as JSON (PDF view)',
  })
  @IsOptional()
  @IsIn(['xlsx', 'all'])
  export?: 'xlsx' | 'all';
}

/** skip/take for the query, honouring exports. */
export function pageArgs(q: PaginationQueryDto) {
  if (q.export) return { skip: 0, take: EXPORT_LIMIT };
  return { skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}

/** Prisma orderBy for an allowed field, else the default. */
export function orderArgs<T extends string>(
  q: PaginationQueryDto,
  allowed: readonly T[],
  fallback: T,
) {
  const field = (allowed as readonly string[]).includes(q.sort ?? '')
    ? (q.sort as T)
    : fallback;
  return { [field]: q.order } as Record<T, 'asc' | 'desc'>;
}

export function paginate<T>(
  data: T[],
  total: number,
  q: PaginationQueryDto,
): Paginated<T> {
  const pageSize = q.export ? Math.max(1, data.length) : q.pageSize;
  const page = q.export ? 1 : q.page;
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/** Case-insensitive `contains` filter. */
export const ilike = (s: string) => ({
  contains: s,
  mode: 'insensitive' as const,
});

/**
 * "to" filters: a bare date (2026-11-30) means the END of that day, so the last day is
 * included; a full timestamp is used as is.
 */
export const EndOfDay = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T23:59:59.999Z`)
      : new Date(value);
  });
