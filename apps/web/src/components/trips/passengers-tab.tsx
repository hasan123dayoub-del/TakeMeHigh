'use client';

import { LABELS, type Attendance } from '@travelos/shared';
import { Check, FileSpreadsheet, Loader2, MessageSquareText, Printer, UserX, Users } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PrintHeader, PrintPortal } from '@/components/data/print';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useInvalidate, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { ManifestPassenger } from '@/lib/types/api';
import { cn } from '@/lib/utils';
import type { Manifest, TripFull } from './trip-utils';

const m = defineMessages({
  ar: {
    title: 'كشف الركاب',
    hint: 'الركاب المؤكدون مباشرة وعبر البرامج. يُستخدم يوم الرحلة للتحقق من الحضور.',
    excel: 'تصدير Excel',
    pdf: 'طباعة PDF',
    printTitle: 'كشف ركاب {code}',
    name: 'الاسم',
    phone: 'الهاتف',
    nationality: 'الجنسية',
    document: 'الوثيقة',
    booking: 'رقم الحجز',
    program: 'عبر برنامج',
    boarding: 'نقطة الانطلاق',
    visa: 'التأشيرة',
    attendance: 'الحضور',
    note: 'ملاحظة الدليل',
    origin: 'الأساسية',
    empty: 'لا يوجد ركاب مؤكدون بعد',
    emptyBody: 'يظهر الركاب هنا عند تأكيد حجوزاتهم.',
    present: 'حاضر',
    absent: 'غائب',
    saved: 'تم تسجيل الحضور',
    noteTitle: 'ملاحظة الدليل',
    total: 'الإجمالي',
    presentCount: 'حاضر',
    absentCount: 'غائب',
    unmarked: 'لم يُسجَّل',
    downloaded: 'تم تنزيل الكشف',
  },
  en: {
    title: 'Passenger list',
    hint: 'Confirmed passengers, direct and via programs. Used on the trip day to check attendance.',
    excel: 'Export Excel',
    pdf: 'Print PDF',
    printTitle: 'Passenger list {code}',
    name: 'Name',
    phone: 'Phone',
    nationality: 'Nationality',
    document: 'Document',
    booking: 'Booking',
    program: 'Via program',
    boarding: 'Boarding point',
    visa: 'Visa',
    attendance: 'Attendance',
    note: 'Guide note',
    origin: 'Main',
    empty: 'No confirmed passengers yet',
    emptyBody: 'Passengers appear here once their bookings are confirmed.',
    present: 'Present',
    absent: 'Absent',
    saved: 'Attendance saved',
    noteTitle: 'Guide note',
    total: 'Total',
    presentCount: 'present',
    absentCount: 'absent',
    unmarked: 'not marked',
    downloaded: 'Passenger list downloaded',
  },
});

export function PassengersTab({ trip }: { trip: TripFull }) {
  const t = useMessages(m);
  const { locale } = useLocale();
  const { can } = useAuth();
  const canAttend = can('trips.attendance');
  const canBookings = can('bookings.view');
  const manifest = useResource<Manifest>(`/trips/${trip.id}/passengers`);
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState<'xlsx' | null>(null);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<ManifestPassenger | null>(null);
  const rows = manifest.data?.passengers ?? [];
  const printTitle = t.printTitle.replace('{code}', trip.code);

  const mark = async (p: ManifestPassenger, attendance: Attendance | null, guideNote?: string) => {
    setSaving(p.id);
    try {
      await api.patch(`/trips/${trip.id}/passengers/${p.id}`, { attendance, ...(guideNote !== undefined ? { guideNote } : {}) });
      await invalidate(`/trips/${trip.id}/passengers`);
      toast.success(t.saved);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const exportXlsx = async () => {
    setBusy('xlsx');
    try {
      await api.download(`/trips/${trip.id}/passengers`, { export: 'xlsx' }, `manifest-${trip.code}.xlsx`);
      toast.success(t.downloaded);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const present = rows.filter((r) => r.attendance === 'PRESENT').length;
  const absent = rows.filter((r) => r.attendance === 'ABSENT').length;
  const docLabel = (p: ManifestPassenger) => (p.document ? `${LABELS.documentType[p.document.docType][locale]} · ${p.document.docNumber}` : '—');

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-primary" aria-hidden />
            {t.title}
          </CardTitle>
          <CardDescription>{t.hint}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPrinting(true)} disabled={!rows.length}>
            <Printer /> {t.pdf}
          </Button>
          <Button size="sm" variant="secondary" onClick={exportXlsx} disabled={!rows.length || !!busy}>
            {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} {t.excel}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 text-[14px]">
            <Badge tone="neutral">
              {t.total} <span className="num">{rows.length}</span>
            </Badge>
            <Badge tone="success" dot>
              <span className="num">{present}</span> {t.presentCount}
            </Badge>
            <Badge tone="danger" dot>
              <span className="num">{absent}</span> {t.absentCount}
            </Badge>
            <Badge tone="neutral" dot>
              <span className="num">{rows.length - present - absent}</span> {t.unmarked}
            </Badge>
          </div>
        )}
        {manifest.isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : manifest.isError ? (
          <p className="text-sm text-danger">{errorMessage(manifest.error)}</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} size="sm" title={t.empty} description={t.emptyBody} />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="eyebrow border-b border-border text-start">
                  <th className="px-2 py-2.5 text-start font-medium">#</th>
                  <th className="px-2 py-2.5 text-start font-medium">{t.name}</th>
                  <th className="px-2 py-2.5 text-start font-medium">{t.phone}</th>
                  <th className="px-2 py-2.5 text-start font-medium">{t.nationality}</th>
                  <th className="px-2 py-2.5 text-start font-medium">{t.document}</th>
                  <th className="px-2 py-2.5 text-start font-medium">{t.booking}</th>
                  <th className="px-2 py-2.5 text-start font-medium">{t.program}</th>
                  <th className="px-2 py-2.5 text-start font-medium">{t.boarding}</th>
                  <th className="px-2 py-2.5 text-start font-medium">{t.visa}</th>
                  <th className="px-2 py-2.5 text-end font-medium">{t.attendance}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="border-b border-border/70 last:border-0 hover:bg-surface-raised/60">
                    <td className="num px-2 py-2.5 text-muted">{i + 1}</td>
                    <td className="px-2 py-2.5">
                      <div className="font-medium">{p.customer.fullName}</div>
                      {p.guideNote && <div className="mt-0.5 max-w-56 truncate text-xs text-muted">{p.guideNote}</div>}
                    </td>
                    <td className="ltr-nums px-2 py-2.5 whitespace-nowrap">{p.customer.phone}</td>
                    <td className="px-2 py-2.5">{p.customer.nationality.nameAr}</td>
                    <td className="px-2 py-2.5 text-[14px] whitespace-nowrap">{docLabel(p)}</td>
                    <td className="px-2 py-2.5">
                      {canBookings ? (
                        <Link href={`/dashboard/bookings/${p.booking.id}`} className="num ltr-nums font-medium text-primary hover:underline">
                          {p.booking.bookingNo}
                        </Link>
                      ) : (
                        <span className="num ltr-nums font-medium">{p.booking.bookingNo}</span>
                      )}
                    </td>
                    <td className="num ltr-nums px-2 py-2.5 text-[14px]">{p.booking.program?.code ?? '—'}</td>
                    <td className="px-2 py-2.5 text-[14px]">
                      {p.booking.pickupPoint ? (
                        <>
                          {p.booking.pickupPoint.city.nameAr}
                          {p.booking.pickupPoint.pickupTime && (
                            <>
                              {' '}
                              <span className="num ltr-nums text-muted">{p.booking.pickupPoint.pickupTime}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">
                          {trip.originCity.nameAr} ({t.origin})
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.visas.length === 0 ? <span className="text-muted">—</span> : p.visas.map((v, j) => <StatusBadge key={j} kind="visa" status={v.status} size="sm" title={v.country.nameAr} />)}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {canAttend ? (
                          <>
                            <AttendanceButton active={p.attendance === 'PRESENT'} tone="success" disabled={saving === p.id} onClick={() => mark(p, p.attendance === 'PRESENT' ? null : 'PRESENT')} label={t.present}>
                              <Check className="size-3.5" />
                            </AttendanceButton>
                            <AttendanceButton active={p.attendance === 'ABSENT'} tone="danger" disabled={saving === p.id} onClick={() => mark(p, p.attendance === 'ABSENT' ? null : 'ABSENT')} label={t.absent}>
                              <UserX className="size-3.5" />
                            </AttendanceButton>
                            <Button size="icon-sm" variant="ghost" aria-label={t.noteTitle} onClick={() => setNoteFor(p)}>
                              <MessageSquareText className={cn(p.guideNote && 'text-primary')} />
                            </Button>
                          </>
                        ) : p.attendance ? (
                          <Badge tone={p.attendance === 'PRESENT' ? 'success' : 'danger'} dot>
                            {LABELS.attendance[p.attendance][locale]}
                          </Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {noteFor && <NoteDialog passenger={noteFor} onClose={() => setNoteFor(null)} onSave={(note) => mark(noteFor, noteFor.attendance, note).then(() => setNoteFor(null))} />}

      {printing && (
        <PrintPortal onDone={() => setPrinting(false)}>
          <PrintHeader title={printTitle} subtitle={`${trip.title} · ${rows.length}`} />
          <table className="print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t.name}</th>
                <th>{t.phone}</th>
                <th>{t.nationality}</th>
                <th>{t.document}</th>
                <th>{t.booking}</th>
                <th>{t.program}</th>
                <th>{t.boarding}</th>
                <th>{t.visa}</th>
                <th>{t.attendance}</th>
                <th>{t.note}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.customer.fullName}</td>
                  <td className="ltr-nums">{p.customer.phone}</td>
                  <td>{p.customer.nationality.nameAr}</td>
                  <td>{docLabel(p)}</td>
                  <td>{p.booking.bookingNo}</td>
                  <td>{p.booking.program?.code ?? ''}</td>
                  <td>{p.booking.pickupPoint?.city.nameAr ?? trip.originCity.nameAr}</td>
                  <td>{p.visas.map((v) => LABELS.visaStatus[v.status][locale]).join('، ')}</td>
                  <td>{p.attendance ? LABELS.attendance[p.attendance][locale] : ''}</td>
                  <td>{p.guideNote ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintPortal>
      )}
    </Card>
  );
}

function AttendanceButton({
  active,
  tone,
  label,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  tone: 'success' | 'danger';
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors disabled:opacity-50',
        active
          ? tone === 'success'
            ? 'border-success bg-success text-white'
            : 'border-danger bg-danger text-white'
          : 'border-border bg-surface-raised text-muted hover:text-foreground',
      )}
    >
      {children}
      <span className="sr-only 2xl:not-sr-only">{label}</span>
    </button>
  );
}

function NoteDialog({ passenger, onClose, onSave }: { passenger: ManifestPassenger; onClose: () => void; onSave: (note: string) => Promise<unknown> }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const [note, setNote] = useState(passenger.guideNote ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t.noteTitle} · {passenger.customer.fullName}
          </DialogTitle>
        </DialogHeader>
        <Textarea rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} autoFocus aria-label={t.noteTitle} />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSave(note.trim());
              setBusy(false);
            }}
          >
            {busy && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
