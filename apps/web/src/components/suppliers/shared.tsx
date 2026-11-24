'use client';

/*
 * Helpers shared by the supplier pages (companies, services & profit, integrations).
 * `ArrayTable` is for endpoints that return a plain array (GET /services, /profit-rules):
 * ResourceTable needs a paginated endpoint, so these lists get client-side sorting and a PDF
 * print view (RPT-02) through the same PrintPortal.
 */
import type { RowData } from '@tanstack/react-table';
import { FileText } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { PrintHeader, PrintPortal } from '@/components/data/print';
import type { ResourceColumn } from '@/components/data/resource-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, dataTableColumns } from '@/components/ui/data-table';
import type { IntegrationStatus, ProfitMode, ServiceKind, TransportMode } from '@travelos/shared';
import { defineMessages, useMessages } from '@/lib/i18n';

export const supplierMessages = defineMessages({
  ar: {
    active: 'فعّال',
    inactive: 'معطّل',
    activeF: 'فعّالة',
    inactiveF: 'معطّلة',
    manual: 'يدوي',
    records: 'سجل',
    pdf: 'PDF',
    required: 'هذا الحقل مطلوب',
  },
  en: {
    active: 'Active',
    inactive: 'Inactive',
    activeF: 'Active',
    inactiveF: 'Inactive',
    manual: 'Manual',
    records: 'records',
    pdf: 'PDF',
    required: 'This field is required',
  },
});

/** Shapes used only by the supplier pages (not in the shared types file). */
export interface Adapter {
  key: string;
  kind: Exclude<ServiceKind, 'OTHER'>;
  label: string;
}

export type SyncResult =
  | { ok: true; created: number; updated: number; costChanges: number; problems: string[] }
  | { ok: false; error: string };

export type TestResult = { ok: true } | { ok: false; error: string };

export type { IntegrationStatus, ProfitMode, ServiceKind, TransportMode };

/** "isActive" badge used across the supplier pages. */
export function ActiveBadge({ active, feminine = false }: { active: boolean; feminine?: boolean }) {
  const t = useMessages(supplierMessages);
  return (
    <Badge tone={active ? 'success' : 'neutral'} dot>
      {active ? (feminine ? t.activeF : t.active) : feminine ? t.inactiveF : t.inactive}
    </Badge>
  );
}

/** Selling price = cost + profit (PRC-02). Returns null when the inputs are not numbers. */
export function sellingPrice(cost: number, mode: ProfitMode, value: number) {
  if (!Number.isFinite(cost) || !Number.isFinite(value)) return null;
  const profit = mode === 'PERCENT' ? (cost * value) / 100 : value;
  return { profit, price: cost + profit };
}

/** A client-side table for array endpoints, with the same column shape as ResourceTable and a PDF print. */
export function ArrayTable<T extends RowData>({
  rows,
  columns,
  loading,
  exportTitle,
  getRowId,
  empty,
  toolbar,
  minWidth,
}: {
  rows: T[];
  columns: ResourceColumn<T>[];
  loading?: boolean;
  exportTitle: string;
  getRowId?: (row: T) => string;
  empty?: { title: string; description?: string; action?: ReactNode };
  toolbar?: ReactNode;
  minWidth?: number;
}) {
  const t = useMessages(supplierMessages);
  const [printing, setPrinting] = useState(false);
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
            enableSorting: false,
            meta: { align: c.align, className: c.className },
          }),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        <Button variant="secondary" size="sm" className="ms-auto" onClick={() => setPrinting(true)} disabled={!rows.length} aria-label={`${t.pdf}: ${exportTitle}`}>
          <FileText /> {t.pdf}
        </Button>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
        <DataTable columns={tableColumns} data={rows} loading={loading} getRowId={getRowId} caption={exportTitle} minWidth={minWidth} empty={empty} />
      </div>
      {printing && (
        <PrintPortal onDone={() => setPrinting(false)}>
          <PrintHeader title={exportTitle} subtitle={`${rows.length} ${t.records}`} />
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
              {rows.map((row, i) => (
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
    </div>
  );
}
