'use client';

import { ArrowRight, CalendarPlus, Eye, FileUp, Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { Field, QueryState } from '@/components/data/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useInvalidate, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { CustomerDetail as CustomerDetailT, CustomerDocument } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { BalanceText, Muted, Section, TargetLink } from '../bookings/parts';
import { CustomerDialog } from './customer-dialog';
import { DocumentDialog } from './document-dialog';
import { ExpiryBadge, useLabel } from './shared';

const m = defineMessages({
  ar: {
    back: 'العملاء',
    eyebrow: 'ملف العميل',
    phone: 'الهاتف',
    nationality: 'الجنسية',
    birthDate: 'تاريخ الميلاد',
    gender: 'الجنس',
    branch: 'فرع التسجيل',
    createdBy: 'أضافه',
    createdAt: 'تاريخ الإضافة',
    notes: 'ملاحظات',
    active: 'فعّال',
    inactive: 'معطّل',
    activate: 'تفعيل',
    deactivate: 'تعطيل',
    deactivateTitle: 'تعطيل العميل؟',
    deactivateBody: 'لن يظهر في البحث عند إنشاء حجوزات جديدة، وتبقى حجوزاته ودفعاته كما هي.',
    activateTitle: 'تفعيل العميل؟',
    deleteTitle: 'حذف العميل نهائياً؟',
    deleteBody: 'يُحذف فقط العميل الذي لا يملك أي حجز (CUS-07). إن كان له حجوزات فعطّله بدلاً من الحذف.',
    deleted: 'تم حذف العميل',
    book: 'حجز رحلة',
    documents: 'الوثائق',
    documentsHint: 'الوثائق تُفحص تلقائياً عند الحجز. صورة الوثيقة محفوظة بشكل خاص ولا تُفتح إلا برابط مؤقت (5 دقائق).',
    addDoc: 'إضافة وثيقة',
    docType: 'النوع',
    docNumber: 'الرقم',
    issuer: 'جهة الإصدار',
    issued: 'الإصدار',
    expires: 'الانتهاء',
    scan: 'الصورة',
    hasScan: 'مرفوعة',
    noScan: 'غير مرفوعة',
    view: 'عرض الصورة',
    upload: 'رفع صورة',
    uploading: 'جارٍ الرفع…',
    uploaded: 'تم رفع الصورة',
    badFile: 'الملف يجب أن يكون JPEG أو PNG أو WebP أو PDF وبحجم 5MB كحد أقصى',
    deleteDocTitle: 'حذف الوثيقة؟',
    deleteDocBody: 'لا تُحذف وثيقة مستخدمة في حجز فعّال.',
    docDeleted: 'تم حذف الوثيقة',
    noDocs: 'لا توجد وثائق بعد.',
    asPayer: 'حجوزات دفعها',
    asPassenger: 'رحلات سافر فيها',
    payments: 'الدفعات',
    visas: 'التأشيرات',
    bookingNo: 'رقم الحجز',
    target: 'الحجز على',
    status: 'الحالة',
    total: 'الإجمالي',
    balance: 'المتبقي',
    date: 'التاريخ',
    attendance: 'الحضور',
    receiptNo: 'رقم الوصل',
    kind: 'النوع',
    amount: 'المبلغ',
    country: 'الدولة',
    visaNo: 'رقم التأشيرة',
    noRows: 'لا شيء هنا بعد.',
    receipt: 'الوصل',
  },
  en: {
    back: 'Customers',
    eyebrow: 'Customer profile',
    phone: 'Phone',
    nationality: 'Nationality',
    birthDate: 'Birth date',
    gender: 'Gender',
    branch: 'Registration branch',
    createdBy: 'Added by',
    createdAt: 'Added on',
    notes: 'Notes',
    active: 'Active',
    inactive: 'Inactive',
    activate: 'Activate',
    deactivate: 'Deactivate',
    deactivateTitle: 'Deactivate this customer?',
    deactivateBody: 'They will not appear when creating new bookings. Their bookings and payments stay as they are.',
    activateTitle: 'Activate this customer?',
    deleteTitle: 'Delete this customer permanently?',
    deleteBody: 'Only a customer without any booking can be deleted (CUS-07). Deactivate customers who have bookings.',
    deleted: 'Customer deleted',
    book: 'Book a trip',
    documents: 'Documents',
    documentsHint: 'Documents are checked automatically when booking. Scans are stored privately and open only through a 5-minute link.',
    addDoc: 'Add document',
    docType: 'Type',
    docNumber: 'Number',
    issuer: 'Issuer',
    issued: 'Issued',
    expires: 'Expires',
    scan: 'Scan',
    hasScan: 'Uploaded',
    noScan: 'Missing',
    view: 'View scan',
    upload: 'Upload scan',
    uploading: 'Uploading…',
    uploaded: 'Scan uploaded',
    badFile: 'The file must be JPEG, PNG, WebP or PDF and at most 5 MB',
    deleteDocTitle: 'Delete this document?',
    deleteDocBody: 'A document used by an active booking cannot be deleted.',
    docDeleted: 'Document deleted',
    noDocs: 'No documents yet.',
    asPayer: 'Bookings paid',
    asPassenger: 'Trips travelled',
    payments: 'Payments',
    visas: 'Visas',
    bookingNo: 'Booking no.',
    target: 'Booked on',
    status: 'Status',
    total: 'Total',
    balance: 'Balance',
    date: 'Date',
    attendance: 'Attendance',
    receiptNo: 'Receipt no.',
    kind: 'Kind',
    amount: 'Amount',
    country: 'Country',
    visaNo: 'Visa no.',
    noRows: 'Nothing here yet.',
    receipt: 'Receipt',
  },
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function CustomerDetail({ id }: { id: string }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const label = useLabel();
  const { locale } = useLocale();
  const router = useRouter();
  const invalidate = useInvalidate();
  const canManage = useCan('customers.manage');
  const canBook = useCan('bookings.create');
  const q = useResource<CustomerDetailT>(`/customers/${id}`);
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [docEditing, setDocEditing] = useState<CustomerDocument | 'new' | null>(null);
  const [docDeleting, setDocDeleting] = useState<CustomerDocument | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<string | null>(null);

  const cu = q.data;

  const openScan = async (doc: CustomerDocument) => {
    // open the tab inside the click so popup blockers allow it, then point it to the signed URL
    const w = window.open('', '_blank');
    try {
      const r = await api.get<{ url: string; expiresAt: string }>(`/customers/${id}/documents/${doc.id}/link`);
      if (w) w.location.href = r.url;
      else window.open(r.url, '_blank', 'noopener');
    } catch (e) {
      w?.close();
      toast.error(errorMessage(e));
    }
  };

  const onFile = async (file: File | undefined) => {
    const docId = uploadFor.current;
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !docId) return;
    if (!ALLOWED.includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(t.badFile);
      return;
    }
    setUploadingId(docId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/customers/${id}/documents/${docId}/file`, fd);
      toast.success(t.uploaded);
      await invalidate('/customers');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {cu && (
        <div className="flex flex-col gap-6">
          <div>
            <Link href="/dashboard/customers" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
              <ArrowRight className="size-4 rtl-flip" aria-hidden /> {t.back}
            </Link>
          </div>
          <PageHeader
            eyebrow={t.eyebrow}
            title={cu.fullName}
            description={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="ltr-nums" dir="ltr">
                  {cu.phone}
                </span>
                <Badge tone={cu.isActive ? 'success' : 'neutral'} dot>
                  {cu.isActive ? t.active : t.inactive}
                </Badge>
              </span>
            }
            actions={
              <>
                {canBook && cu.isActive && (
                  <Button asChild>
                    <Link href={`/dashboard/bookings/new?customerId=${cu.id}`}>
                      <CalendarPlus /> {t.book}
                    </Link>
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button variant="secondary" onClick={() => setEditing(true)}>
                      <Pencil /> {c.edit}
                    </Button>
                    <Button variant="secondary" onClick={() => setToggling(true)}>
                      <Power className={cu.isActive ? 'text-danger' : 'text-success'} /> {cu.isActive ? t.deactivate : t.activate}
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleting(true)} aria-label={c.delete}>
                      <Trash2 className="text-danger" /> {c.delete}
                    </Button>
                  </>
                )}
              </>
            }
          />

          <Section title={t.eyebrow}>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t.nationality}>{cu.nationality.nameAr}</Field>
              <Field label={t.birthDate}>{cu.birthDate ? f.date(cu.birthDate, 'medium') : '—'}</Field>
              <Field label={t.gender}>{label('gender', cu.gender)}</Field>
              <Field label={t.branch}>{cu.branch.name}</Field>
              <Field label={t.createdBy}>{cu.createdBy?.fullName ?? '—'}</Field>
              <Field label={t.createdAt}>{f.date(cu.createdAt, 'medium')}</Field>
              <Field label={t.notes} className="sm:col-span-2">
                {cu.notes || '—'}
              </Field>
            </dl>
          </Section>

          <Section
            title={t.documents}
            description={t.documentsHint}
            actions={
              canManage && (
                <Button size="sm" onClick={() => setDocEditing('new')}>
                  <Plus /> {t.addDoc}
                </Button>
              )
            }
          >
            {cu.documents.length === 0 ? (
              <Muted>{t.noDocs}</Muted>
            ) : (
              <Table className="text-start">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t.docType}</TableHead>
                    <TableHead className="text-start">{t.docNumber}</TableHead>
                    <TableHead className="text-start">{t.issuer}</TableHead>
                    <TableHead className="text-start">{t.issued}</TableHead>
                    <TableHead className="text-start">{t.expires}</TableHead>
                    <TableHead className="text-start">{t.scan}</TableHead>
                    <TableHead className="text-end">{c.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cu.documents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{label('documentType', d.docType)}</TableCell>
                      <TableCell>
                        <span className="num ltr-nums" dir="ltr">
                          {d.docNumber}
                        </span>
                      </TableCell>
                      <TableCell>{d.issuingCountry?.nameAr ?? '—'}</TableCell>
                      <TableCell className="num">{d.issuedOn ? f.date(d.issuedOn, 'medium') : '—'}</TableCell>
                      <TableCell>
                        <ExpiryBadge expiresOn={d.expiresOn} />
                      </TableCell>
                      <TableCell>
                        <Badge tone={d.filePath ? 'success' : 'neutral'} size="sm">
                          {d.filePath ? t.hasScan : t.noScan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {d.filePath && (
                            <Button size="xs" variant="secondary" onClick={() => openScan(d)}>
                              <Eye /> {t.view}
                            </Button>
                          )}
                          {canManage && (
                            <>
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={uploadingId === d.id}
                                onClick={() => {
                                  uploadFor.current = d.id;
                                  fileRef.current?.click();
                                }}
                              >
                                {uploadingId === d.id ? <Loader2 className="animate-spin" /> : <FileUp />} {uploadingId === d.id ? t.uploading : t.upload}
                              </Button>
                              <Button size="icon-sm" variant="ghost" aria-label={c.edit} onClick={() => setDocEditing(d)}>
                                <Pencil />
                              </Button>
                              <Button size="icon-sm" variant="ghost" aria-label={c.delete} onClick={() => setDocDeleting(d)}>
                                <Trash2 className="text-danger" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </Section>

          <Tabs defaultValue="payer" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <TabsList>
              <TabsTrigger value="payer">
                {t.asPayer} <span className="num text-xs opacity-70">{cu.bookingsAsPayer.length}</span>
              </TabsTrigger>
              <TabsTrigger value="trips">
                {t.asPassenger} <span className="num text-xs opacity-70">{cu.trips.length}</span>
              </TabsTrigger>
              <TabsTrigger value="payments">
                {t.payments} <span className="num text-xs opacity-70">{cu.payments.length}</span>
              </TabsTrigger>
              <TabsTrigger value="visas">
                {t.visas} <span className="num text-xs opacity-70">{cu.visas.length}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="payer">
              <Section title={t.asPayer}>
                <BookingsTable rows={cu.bookingsAsPayer.map((b) => ({ booking: b }))} />
              </Section>
            </TabsContent>
            <TabsContent value="trips">
              <Section title={t.asPassenger}>
                <BookingsTable rows={cu.trips} showAttendance />
              </Section>
            </TabsContent>
            <TabsContent value="payments">
              <Section title={t.payments}>
                {cu.payments.length === 0 ? (
                  <Muted>{t.noRows}</Muted>
                ) : (
                  <Table className="text-start">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">{t.receiptNo}</TableHead>
                        <TableHead className="text-start">{t.date}</TableHead>
                        <TableHead className="text-start">{t.kind}</TableHead>
                        <TableHead className="text-start">{t.bookingNo}</TableHead>
                        <TableHead className="text-end">{t.amount}</TableHead>
                        <TableHead className="text-end">{t.receipt}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cu.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="num font-medium">{p.receiptNo}</TableCell>
                          <TableCell className="num">{f.date(p.paidAt, 'dateTime')}</TableCell>
                          <TableCell>
                            <StatusBadge kind="paymentKind" status={p.kind} />
                          </TableCell>
                          <TableCell className="num">{p.booking.bookingNo}</TableCell>
                          <TableCell className={`num text-end ${p.kind === 'REFUND' ? 'text-danger' : ''}`}>
                            {p.kind === 'REFUND' ? '− ' : ''}
                            {f.money(p.amount, p.currencyCode)}
                          </TableCell>
                          <TableCell className="text-end">
                            <Button size="xs" variant="link" asChild>
                              <Link href={`/dashboard/payments/${p.id}/receipt`}>{t.receipt}</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>
            </TabsContent>
            <TabsContent value="visas">
              <Section title={t.visas}>
                {cu.visas.length === 0 ? (
                  <Muted>{t.noRows}</Muted>
                ) : (
                  <Table className="text-start">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">{t.country}</TableHead>
                        <TableHead className="text-start">{t.bookingNo}</TableHead>
                        <TableHead className="text-start">{t.status}</TableHead>
                        <TableHead className="text-start">{t.visaNo}</TableHead>
                        <TableHead className="text-start">{t.expires}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cu.visas.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.country.nameAr}</TableCell>
                          <TableCell className="num">{v.passenger.booking.bookingNo}</TableCell>
                          <TableCell>
                            <StatusBadge kind="visa" status={v.status} />
                          </TableCell>
                          <TableCell className="num ltr-nums">{v.visaNumber ?? '—'}</TableCell>
                          <TableCell className="num">{v.expiresOn ? f.date(v.expiresOn, 'medium') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>
            </TabsContent>
          </Tabs>

          {editing && <CustomerDialog customer={cu} onClose={() => setEditing(false)} />}
          {docEditing && <DocumentDialog customerId={cu.id} doc={docEditing === 'new' ? null : docEditing} onClose={() => setDocEditing(null)} />}

          <ConfirmDialog
            open={toggling}
            onOpenChange={setToggling}
            title={cu.isActive ? t.deactivateTitle : t.activateTitle}
            description={cu.isActive ? t.deactivateBody : undefined}
            destructive={cu.isActive}
            confirmLabel={cu.isActive ? t.deactivate : t.activate}
            onConfirm={async () => {
              try {
                await api.patch(`/customers/${cu.id}/active`, { isActive: !cu.isActive });
                await invalidate('/customers');
              } catch (e) {
                toast.error(errorMessage(e));
                throw e;
              }
            }}
          />
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title={t.deleteTitle}
            description={t.deleteBody}
            destructive
            confirmLabel={c.delete}
            onConfirm={async () => {
              try {
                await api.delete(`/customers/${cu.id}`);
                toast.success(t.deleted);
                await invalidate('/customers');
                router.replace('/dashboard/customers');
              } catch (e) {
                toast.error(errorMessage(e));
                throw e;
              }
            }}
          />
          <ConfirmDialog
            open={!!docDeleting}
            onOpenChange={(o) => !o && setDocDeleting(null)}
            title={t.deleteDocTitle}
            description={t.deleteDocBody}
            destructive
            confirmLabel={c.delete}
            onConfirm={async () => {
              if (!docDeleting) return;
              try {
                await api.delete(`/customers/${cu.id}/documents/${docDeleting.id}`);
                toast.success(t.docDeleted);
                await invalidate('/customers');
              } catch (e) {
                toast.error(errorMessage(e));
                throw e;
              }
            }}
          />
        </div>
      )}
    </QueryState>
  );
}

function BookingsTable({ rows, showAttendance }: { rows: { attendance?: CustomerDetailT['trips'][number]['attendance']; booking: CustomerDetailT['bookingsAsPayer'][number] }[]; showAttendance?: boolean }) {
  const t = useMessages(m);
  const f = useFormat();
  const label = useLabel();
  const router = useRouter();
  if (!rows.length) return <Muted>{t.noRows}</Muted>;
  return (
    <Table className="text-start">
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">{t.bookingNo}</TableHead>
          <TableHead className="text-start">{t.date}</TableHead>
          <TableHead className="text-start">{t.target}</TableHead>
          <TableHead className="text-start">{t.status}</TableHead>
          {showAttendance && <TableHead className="text-start">{t.attendance}</TableHead>}
          <TableHead className="text-end">{t.total}</TableHead>
          <TableHead className="text-end">{t.balance}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ booking: b, attendance }) => {
          const balance = Number(b.totalAmount) - (Number(b.paidAmount) - Number(b.refundedAmount));
          return (
            <TableRow key={b.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/bookings/${b.id}`)}>
              <TableCell className="num font-medium">{b.bookingNo}</TableCell>
              <TableCell className="num">{f.date(b.createdAt, 'medium')}</TableCell>
              <TableCell>
                <TargetLink b={b} />
              </TableCell>
              <TableCell>
                <StatusBadge kind="booking" status={b.status} />
              </TableCell>
              {showAttendance && (
                <TableCell>
                  {attendance ? (
                    <Badge tone={attendance === 'PRESENT' ? 'success' : 'danger'} size="sm">
                      {label('attendance', attendance)}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
              )}
              <TableCell className="num text-end">{f.money(b.totalAmount, b.currencyCode)}</TableCell>
              <TableCell className="text-end">{b.status === 'CANCELLED' ? <span className="text-subtle">—</span> : <BalanceText value={balance} currency={b.currencyCode} />}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
