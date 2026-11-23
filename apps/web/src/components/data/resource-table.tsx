'use client';

import type { RowData, SortingState } from '@tanstack/react-table';
import { FileSpreadsheet, FileText, Loader2, Search, X } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, dataTableColumns } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { useList, useUrlState, type Params } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import type { Paginated } from '@/lib/types/api';
import { cn } from '@/lib/utils';
import { PrintHeader, PrintPortal } from './print';

export interface ResourceColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Plain-text version for the printed PDF (defaults to `cell`). */
  print?: (row: T) => ReactNode;
  /** Server sort field (enables the sort button). */
  sortKey?: string;
  align?: 'start' | 'end' | 'center';
  className?: string;
  /** Hidden on the screen table but printed (e.g. long notes). */
  printOnly?: boolean;
  /** Shown on screen but not printed (e.g. action buttons). */
  screenOnly?: boolean;
}

const m = defineMessages({
  ar: { excel: 'Excel', pdf: 'PDF', exporting: 'جارٍ التصدير…', search: 'ابحث…', clear: 'مسح', records: 'سجل', exported: 'تم تنزيل ملف Excel' },
  en: { excel: 'Excel', pdf: 'PDF', exporting: 'Exporting…', search: 'Search…', clear: 'Clear', records: 'records', exported: 'Excel file downloaded' },
});

export interface ResourceTableProps<T> {
  /** API list endpoint, e.g. "/trips" */
  endpoint: string;
  columns: ResourceColumn<T>[];
  /** Fixed query params (e.g. { tripId }) merged with the URL filters */
  params?: Params;
  /** URL filter keys this table reads (besides page/pageSize/search/sort/order) */
  filterKeys?: string[];
  /** Filter controls rendered next to the search box; they call `setFilter` */
  filters?: (filter: Record<string, string | undefined>, setFilter: (patch: Record<string, string | undefined>) => void) => ReactNode;
  /** Title printed on the PDF and used for the file name */
  exportTitle: string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  empty?: { title: string; description?: string; action?: ReactNode };
  /** Hide the search box */
  noSearch?: boolean;
  /** Extra toolbar buttons (end side) */
  actions?: ReactNode;
  /** Summary under the toolbar (e.g. totals from the response) */
  summary?: (page: Paginated<T> | undefined) => ReactNode;
  defaultSort?: { key: string; order: 'asc' | 'desc' };
  minWidth?: number;
  /** Rows per page choices */
  pageSizes?: number[];
  /** Use URL state (default). Turn off for tables embedded in a detail page. */
  urlState?: boolean;
  className?: string;
}

/**
 * Every list in the dashboard: server-side pagination, sorting and search (RPT-03), URL-backed
 * filters, and export of ALL matching rows to Excel (server) or PDF (print view) (RPT-01, RPT-02).
 */
export function ResourceTable<T extends RowData>(props: ResourceTableProps<T>) {
  const { urlState = true } = props;
  return urlState ? <UrlResourceTable {...props} /> : <LocalResourceTable {...props} />;
}

function UrlResourceTable<T extends RowData>(props: ResourceTableProps<T>) {
  const defaults = useMemo(() => {
    const d: Record<string, string | undefined> = { page: '1', pageSize: '25', search: undefined, sort: props.defaultSort?.key, order: props.defaultSort?.order ?? 'desc' };
    for (const k of props.filterKeys ?? []) d[k] = undefined;
    return d;
  }, [props.defaultSort, props.filterKeys]);
  const [state, set] = useUrlState(defaults);
  return <TableBody {...props} state={state} set={set} />;
}

function LocalResourceTable<T extends RowData>(props: ResourceTableProps<T>) {
  const [state, setState] = useState<Record<string, string | undefined>>({ page: '1', pageSize: '10', sort: props.defaultSort?.key, order: props.defaultSort?.order ?? 'desc' });
  const set = useCallback((patch: Record<string, string | number | undefined | null>, resetPage = true) => {
    setState((s) => {
      const next = { ...s };
      for (const [k, v] of Object.entries(patch)) next[k] = v === null || v === undefined || v === '' ? undefined : String(v);
      if (resetPage && !('page' in patch)) next.page = '1';
      return next;
    });
  }, []);
  return <TableBody {...props} state={state} set={set} />;
}

function TableBody<T extends RowData>({
  endpoint,
  columns,
  params,
  filters,
  exportTitle,
  searchPlaceholder,
  onRowClick,
  getRowId,
  empty,
  noSearch,
  actions,
  summary,
  minWidth,
  pageSizes = [10, 25, 50, 100],
  className,
  state,
  set,
}: ResourceTableProps<T> & { state: Record<string, string | undefined>; set: (patch: Record<string, string | number | undefined | null>, resetPage?: boolean) => void }) {
  const t = useMessages(m);
  const [searchDraft, setSearchDraft] = useState(state.search ?? '');
  const [printing, setPrinting] = useState<T[] | null>(null);
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);

  const query: Params = useMemo(() => {
    const q: Params = { ...params };
    for (const [k, v] of Object.entries(state)) if (v !== undefined) q[k] = v;
    return q;
  }, [params, state]);

  const list = useList<T>(endpoint, query);

  const sorting: SortingState = state.sort ? [{ id: columns.find((c) => c.sortKey === state.sort)?.id ?? state.sort, desc: state.order !== 'asc' }] : [];
  const col = dataTableColumns<T>();
  const tableColumns = useMemo(
    () =>
      columns
        .filter((c) => !c.printOnly)
        .map((c) =>
          col.accessor(() => '', {
            id: c.id,
            header: () => c.header,
            cell: ({ row }) => c.cell(row.original),
            enableSorting: !!c.sortKey,
            meta: { align: c.align, className: c.className },
          }),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns],
  );

  const exportXlsx = async () => {
    setBusy('xlsx');
    try {
      const { page: _p, pageSize: _s, ...rest } = query;
      void _p;
      void _s;
      await api.download(endpoint, { ...rest, export: 'xlsx' }, `${exportTitle}.xlsx`);
      toast.success(t.exported);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy('pdf');
    try {
      const { page: _p, pageSize: _s, ...rest } = query;
      void _p;
      void _s;
      const all = await api.get<Paginated<T>>(endpoint, { query: { ...rest, export: 'all' } });
      setPrinting(all.data);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const filterState = state;
  const setFilter = (patch: Record<string, string | undefined>) => set(patch);

  return (
    <Card className={cn('flex flex-col gap-4 p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {!noSearch && (
          <form
            className="relative min-w-[200px] flex-1 sm:max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              set({ search: searchDraft.trim() || undefined });
            }}
          >
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onBlur={() => searchDraft.trim() !== (state.search ?? '') && set({ search: searchDraft.trim() || undefined })}
              placeholder={searchPlaceholder ?? t.search}
              aria-label={searchPlaceholder ?? t.search}
              className="h-10 ps-10 pe-9"
            />
            {searchDraft && (
              <button
                type="button"
                className="absolute end-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-subtle hover:bg-surface hover:text-foreground"
                aria-label={t.clear}
                onClick={() => {
                  setSearchDraft('');
                  set({ search: undefined });
                }}
              >
                <X className="size-3.5" />
              </button>
            )}
          </form>
        )}
        {filters?.(filterState, setFilter)}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {actions}
          <Button variant="secondary" size="sm" onClick={exportPdf} disabled={!!busy || !list.data?.meta.total} aria-label={`${t.pdf}: ${exportTitle}`}>
            {busy === 'pdf' ? <Loader2 className="animate-spin" /> : <FileText />} {t.pdf}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportXlsx} disabled={!!busy || !list.data?.meta.total} aria-label={`${t.excel}: ${exportTitle}`}>
            {busy === 'xlsx' ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} {t.excel}
          </Button>
        </div>
      </div>
      {summary?.(list.data)}
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
        <DataTable
          columns={tableColumns}
          data={list.data?.data ?? []}
          loading={list.isLoading}
          empty={empty ? { title: empty.title, description: empty.description, action: empty.action } : undefined}
          sorting={sorting}
          onSortingChange={(s) => {
            const first = s[0];
            const c = first ? columns.find((x) => x.id === first.id) : undefined;
            set({ sort: c?.sortKey, order: first ? (first.desc ? 'desc' : 'asc') : undefined });
          }}
          pagination={list.data ? { ...list.data.meta } : undefined}
          onPageChange={(p) => set({ page: p }, false)}
          onPageSizeChange={(s) => set({ pageSize: s })}
          pageSizeOptions={pageSizes}
          onRowClick={onRowClick}
          getRowId={getRowId}
          caption={exportTitle}
          minWidth={minWidth}
        />
      </div>
      {list.isError && <p className="text-sm text-danger">{errorMessage(list.error)}</p>}
      {printing && (
        <PrintPortal onDone={() => setPrinting(null)}>
          <PrintHeader title={exportTitle} subtitle={`${printing.length} ${t.records}`} />
          <table className="print-table">
            <thead>
              <tr>
                {columns
                  .filter((c) => !c.screenOnly)
                  .map((c) => (
                    <th key={c.id}>{c.header}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {printing.map((row, i) => (
                <tr key={getRowId?.(row) ?? i}>
                  {columns
                    .filter((c) => !c.screenOnly)
                    .map((c) => (
                      <td key={c.id}>{(c.print ?? c.cell)(row)}</td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </PrintPortal>
      )}
    </Card>
  );
}

/** A compact select used in table toolbars. `options` value '' = all. */
export { FilterSelect } from './filter-select';
