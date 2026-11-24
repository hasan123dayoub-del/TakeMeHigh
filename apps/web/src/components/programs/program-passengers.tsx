'use client';

/* PGM-09: passengers of a program (every non-cancelled booking) with a printable list. */
import type { BookingStatus, DocumentType } from '@travelos/shared';
import { Printer, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PrintHeader, PrintPortal } from '@/components/data/print';
import { QueryState } from '@/components/data/states';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useResource } from '@/lib/hooks';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import { programMessages } from './messages';

interface ProgramPassengers {
  program: { id: string; code: string; title: string };
  total: number;
  passengers: {
    id: string;
    customer: { id: string; fullName: string; phone: string; nationality: { nameAr: string } };
    document: { docType: DocumentType; docNumber: string; expiresOn: string | null } | null;
    booking: { id: string; bookingNo: string; status: BookingStatus; branch: { name: string } };
  }[];
}

export function ProgramPassengers({ programId }: { programId: string }) {
  const t = useMessages(programMessages);
  const { locale } = useLocale();
  const q = useResource<ProgramPassengers>(`/programs/${programId}/passengers`);
  const [printing, setPrinting] = useState(false);
  const rows = q.data?.passengers ?? [];

  const doc = (p: ProgramPassengers['passengers'][number]) => (p.document ? `${LABELS.documentType[p.document.docType][locale]} · ${p.document.docNumber}` : '—');

  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="heading-display text-[16px]">{t.passengersTitle}</h3>
            <p className="mt-1 text-[14px] text-muted">{fmt(t.passengersCount, { n: q.data?.total ?? 0 })}</p>
          </div>
          <Button variant="secondary" size="sm" disabled={!rows.length} onClick={() => setPrinting(true)}>
            <Printer /> {t.printList}
          </Button>
        </div>
        {!rows.length ? (
          <EmptyState size="sm" icon={Users} title={t.noPassengers} description={t.noPassengersBody} />
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <table className="w-full min-w-[860px] border-collapse text-start text-[14px]">
              <thead>
                <tr className="text-xs text-muted">
                  {['#', t.passengerName, t.phone, t.nationality, t.document, t.bookingNo, t.bookingStatus, t.branch].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="border-t border-border hover:bg-surface-raised/70">
                    <td className="num px-3 py-2.5 text-subtle">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{p.customer.fullName}</td>
                    <td className="px-3 py-2.5">
                      <span className="ltr-nums num">{p.customer.phone}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{p.customer.nationality.nameAr}</td>
                    <td className="px-3 py-2.5 text-muted">
                      <span className="num">{doc(p)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/dashboard/bookings/${p.booking.id}`} className="num ltr-nums font-medium text-primary hover:underline">
                        {p.booking.bookingNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge kind="booking" status={p.booking.status} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 text-muted">{p.booking.branch.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {printing && q.data && (
        <PrintPortal onDone={() => setPrinting(false)}>
          <PrintHeader title={`${t.passengersTitle} — ${q.data.program.title}`} subtitle={`${q.data.program.code} · ${fmt(t.passengersCount, { n: q.data.total })}`} />
          <table className="print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t.passengerName}</th>
                <th>{t.phone}</th>
                <th>{t.nationality}</th>
                <th>{t.document}</th>
                <th>{t.bookingNo}</th>
                <th>{t.bookingStatus}</th>
                <th>{t.branch}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.customer.fullName}</td>
                  <td className="ltr-nums">{p.customer.phone}</td>
                  <td>{p.customer.nationality.nameAr}</td>
                  <td>{doc(p)}</td>
                  <td className="ltr-nums">{p.booking.bookingNo}</td>
                  <td>{LABELS.bookingStatus[p.booking.status][locale]}</td>
                  <td>{p.booking.branch.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintPortal>
      )}
    </QueryState>
  );
}
