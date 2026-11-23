'use client';

import {
  createColumnHelper,
  createSortedRowModel,
  metaHelper,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Inbox } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { formatNumber } from '@/lib/format';
import { useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { EmptyState, type EmptyStateProps } from './empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

export interface DataTableColumnMeta {
  /** Right-align numbers and money. */
  align?: 'start' | 'end' | 'center';
  /** Extra classes for header + cells in this column. */
  className?: string;
  /** Skeleton width while loading. */
  skeletonWidth?: string;
}

/** Feature set shared by every DataTable (client-side sorting). Module-scope = stable. */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
    datetime: sortFn_datetime,
    basic: sortFn_basic,
  },
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;

/**
 * Typed column helper for DataTable:
 * `const col = dataTableColumns<Booking>(); const columns = col.columns([col.accessor('ref', { header: 'Booking' })]);`
 * Define columns at module scope (or memoise them) so rows are not re-derived each render.
 */
export function dataTableColumns<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

export interface DataTablePaginationState {
  page: number; // 1-based, as returned by the API's Paginated<T>.meta
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DataTableProps<TData extends RowData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ReadonlyArray<ColumnDef<DataTableFeatures, TData, any>>;
  data: TData[];
  loading?: boolean;
  /** Rows shown while loading. */
  skeletonRows?: number;
  /** Shown when not loading and data is empty. */
  empty?: Partial<EmptyStateProps>;
  /** Server-side sorting: pass state + handler and the table stops sorting locally. */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  initialSorting?: SortingState;
  /** Server pagination meta (from Paginated<T>.meta). Renders the footer controls. */
  pagination?: DataTablePaginationState;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData, index: number) => string;
  /** Accessible name for the table. */
  caption?: string;
  toolbar?: ReactNode;
  className?: string;
  minWidth?: number;
}

const ALIGN = { start: 'text-start', end: 'text-end', center: 'text-center' } as const;

export function DataTable<TData extends RowData>({
  columns,
  data,
  loading = false,
  skeletonRows = 6,
  empty,
  sorting: controlledSorting,
  onSortingChange,
  initialSorting = [],
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  onRowClick,
  getRowId,
  caption,
  toolbar,
  className,
  minWidth = 720,
}: DataTableProps<TData>) {
  const [localSorting, setLocalSorting] = useState<SortingState>(initialSorting);
  const manualSorting = controlledSorting !== undefined;
  const sorting = controlledSorting ?? localSorting;

  const table = useTable({
    features: dataTableFeatures,
    columns: columns as ColumnDef<DataTableFeatures, TData, unknown>[],
    data,
    getRowId,
    manualSorting,
    enableSortingRemoval: true,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      if (manualSorting) onSortingChange?.(next);
      else setLocalSorting(next);
    },
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const leafColumns = table.getAllLeafColumns();
  const showEmpty = !loading && rows.length === 0;

  return (
    <div data-slot="data-table" className={cn('flex flex-col gap-3', className)}>
      {toolbar}
      <Table aria-busy={loading || undefined} aria-label={caption} style={{ minWidth }}>
        <TableHeader>
          {headerGroups.map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const canSort = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                const align = ALIGN[meta?.align ?? 'start'];
                return (
                  <TableHead
                    key={header.id}
                    className={cn(align, meta?.className)}
                    aria-sort={
                      dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined
                    }
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          '-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 uppercase transition-colors hover:text-foreground',
                          dir && 'text-foreground',
                          meta?.align === 'end' && 'flex-row-reverse',
                        )}
                      >
                        <table.FlexRender header={header} />
                        {dir === 'asc' ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : dir === 'desc' ? (
                          <ArrowDown className="size-3" aria-hidden />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </tr>
          ))}
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                  {leafColumns.map((col) => {
                    const meta = col.columnDef.meta;
                    return (
                      <TableCell key={col.id} className={ALIGN[meta?.align ?? 'start']}>
                        <Skeleton
                          className={cn('h-4', meta?.align === 'end' && 'ms-auto')}
                          style={{
                            width:
                              meta?.skeletonWidth ?? `${55 + ((i * 17 + col.id.length * 7) % 40)}%`,
                          }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getAllCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(ALIGN[meta?.align ?? 'start'], meta?.className)}
                      >
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
        </TableBody>
      </Table>

      {showEmpty && (
        <EmptyState
          size="sm"
          icon={empty?.icon ?? Inbox}
          title={empty?.title ?? '—'}
          description={empty?.description}
          action={empty?.action}
          secondaryAction={empty?.secondaryAction}
        />
      )}

      {pagination && (
        <DataTablePagination
          {...pagination}
          loading={loading}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  loading,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: DataTablePaginationState & {
  loading?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}) {
  const t = useMessages(common);
  const { intl } = useLocale();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Math.max(totalPages, 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-[13px] text-muted"
    >
      <p className="num" aria-live="polite">
        {t.showing} <span className="font-medium text-foreground">{formatNumber(from, { locale: intl })}</span>–
        <span className="font-medium text-foreground">{formatNumber(to, { locale: intl })}</span> {t.of}{' '}
        <span className="font-medium text-foreground">{formatNumber(total, { locale: intl })}</span>
      </p>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">{t.rows}</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger size="sm" className="w-[76px]" aria-label={t.rows}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="num hidden sm:inline">
          {t.page} {formatNumber(page, { locale: intl })} {t.of} {formatNumber(pages, { locale: intl })}
        </span>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={t.previous}
            disabled={loading || page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            <ChevronLeft className="rtl-flip" />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={t.next}
            disabled={loading || page >= pages}
            onClick={() => onPageChange?.(page + 1)}
          >
            <ChevronRight className="rtl-flip" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
