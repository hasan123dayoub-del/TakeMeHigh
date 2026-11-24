'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { GENDERS, LABELS } from '@travelos/shared';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useInvalidate, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Customer } from '@/lib/types/api';
import { docBody, docMessages, DocumentFields, emptyDoc, validateDoc, type DocDraft, type DocErrors } from './document-dialog';
import { dateInput, useDebounced, useSyriaId } from './shared';

const m = defineMessages({
  ar: {
    newTitle: 'عميل جديد',
    editTitle: 'تعديل بيانات العميل',
    hint: 'يُسجَّل العميل في فرعك. يكفي الاسم والهاتف والجنسية، ويمكن إضافة الوثائق الآن أو لاحقاً.',
    fullName: 'الاسم الكامل',
    phone: 'الهاتف',
    nationality: 'الجنسية',
    birthDate: 'تاريخ الميلاد',
    gender: 'الجنس',
    notes: 'ملاحظات',
    branch: 'فرع التسجيل',
    required: 'هذا الحقل مطلوب',
    nameShort: 'الاسم قصير جداً',
    phoneInvalid: 'رقم هاتف غير صالح',
    duplicate: 'يوجد عميل بنفس الهاتف/الوثيقة',
    duplicateHint: 'تأكد أنه ليس الشخص نفسه قبل المتابعة (تنبيه فقط، يمكنك الحفظ).',
    addDoc: 'إضافة أول وثيقة الآن',
    docSection: 'الوثيقة',
    saved: 'تم حفظ العميل',
    docFailed: 'حُفظ العميل لكن تعذّر حفظ الوثيقة',
    none: '—',
  },
  en: {
    newTitle: 'New customer',
    editTitle: 'Edit customer',
    hint: 'The customer is registered in your branch. Name, phone and nationality are enough; documents can be added now or later.',
    fullName: 'Full name',
    phone: 'Phone',
    nationality: 'Nationality',
    birthDate: 'Birth date',
    gender: 'Gender',
    notes: 'Notes',
    branch: 'Registration branch',
    required: 'This field is required',
    nameShort: 'The name is too short',
    phoneInvalid: 'Invalid phone number',
    duplicate: 'A customer with the same phone/document exists',
    duplicateHint: 'Make sure it is not the same person before you continue (a warning only, you can save).',
    addDoc: 'Add the first document now',
    docSection: 'Document',
    saved: 'Customer saved',
    docFailed: 'The customer was saved but the document was not',
    none: '—',
  },
});

interface Duplicate {
  id: string;
  fullName: string;
  phone: string;
  branch: { name: string };
}

/**
 * Create / edit a customer (CUS-01) with a live duplicate warning (warn, never block)
 * and, for a new customer, the first travel document in the same step.
 */
export function CustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Pick<Customer, 'id' | 'fullName' | 'phone' | 'nationalityCountryId' | 'birthDate' | 'gender' | 'notes' | 'branchId'> | null;
  onClose: () => void;
  onSaved?: (c: Customer) => void;
}) {
  const t = useMessages(m);
  const td = useMessages(docMessages);
  const c = useMessages(common);
  const { locale } = useLocale();
  const { isAdmin } = useAuth();
  const lookups = useLookups();
  const name = useName();
  const syriaId = useSyriaId();
  const invalidate = useInvalidate();
  const isNew = !customer;

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(3, { error: t.nameShort }),
        phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, { error: t.phoneInvalid }),
        nationalityCountryId: z.string().min(1, { error: t.required }),
        birthDate: z.string().optional(),
        gender: z.string().optional(),
        notes: z.string().max(1000).optional(),
        branchId: isAdmin && isNew ? z.string().min(1, { error: t.required }) : z.string().optional(),
      }),
    [t, isAdmin, isNew],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: customer?.fullName ?? '',
      phone: customer?.phone ?? '',
      nationalityCountryId: customer?.nationalityCountryId ?? syriaId,
      birthDate: dateInput(customer?.birthDate),
      gender: customer?.gender ?? '',
      notes: customer?.notes ?? '',
      branchId: customer?.branchId ?? '',
    },
  });
  // lookups may arrive after the first render: default nationality = Syria
  useEffect(() => {
    if (!form.getValues('nationalityCountryId') && syriaId) form.setValue('nationalityCountryId', syriaId);
  }, [syriaId, form]);

  const [withDoc, setWithDoc] = useState(false);
  const [doc, setDoc] = useState<DocDraft>(() => emptyDoc(syriaId));
  const [docErrors, setDocErrors] = useState<DocErrors>({});
  const effDoc = !doc.issuingCountryId && doc.docType === 'SYRIAN_ID' ? { ...doc, issuingCountryId: syriaId } : doc;
  const [busy, setBusy] = useState(false);

  // live duplicate check (CUS-01)
  const phone = useDebounced(form.watch('phone')?.trim() ?? '');
  const docNumber = useDebounced(withDoc ? effDoc.docNumber.trim() : '');
  const dupParams = { phone: phone.replace(/[^\d+]/g, '').length >= 7 ? phone : undefined, docNumber: docNumber.length >= 3 ? docNumber : undefined, excludeId: customer?.id };
  const dups = useResource<Duplicate[]>('/customers/duplicates', dupParams, { enabled: !!(dupParams.phone || dupParams.docNumber) });
  const duplicates = dupParams.phone || dupParams.docNumber ? (dups.data ?? []) : [];

  const submit = form.handleSubmit(async (v) => {
    if (isNew && withDoc) {
      const e = validateDoc(effDoc, td, syriaId);
      setDocErrors(e);
      if (Object.keys(e).length) return;
    }
    setBusy(true);
    try {
      const body = {
        fullName: v.fullName.trim(),
        phone: v.phone.trim(),
        nationalityCountryId: v.nationalityCountryId,
        birthDate: v.birthDate || undefined,
        gender: v.gender || undefined,
        notes: v.notes?.trim() || undefined,
        branchId: isAdmin && v.branchId ? v.branchId : undefined,
      };
      const saved = isNew ? await api.post<Customer>('/customers', body) : await api.patch<Customer>(`/customers/${customer.id}`, body);
      if (isNew && withDoc) {
        try {
          await api.post(`/customers/${saved.id}/documents`, docBody(effDoc));
        } catch (err) {
          toast.error(t.docFailed, { description: errorMessage(err) });
        }
      }
      toast.success(t.saved);
      await invalidate('/customers');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  });

  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? t.newTitle : t.editTitle}</DialogTitle>
          <DialogDescription>{t.hint}</DialogDescription>
        </DialogHeader>
        <form id="customer-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField label={t.fullName} error={errors.fullName?.message} required className="sm:col-span-2">
            <Input {...form.register('fullName')} autoFocus maxLength={160} />
          </FormField>
          <FormField label={t.phone} error={errors.phone?.message} required>
            <Input dir="ltr" inputMode="tel" placeholder="09xxxxxxxx" {...form.register('phone')} />
          </FormField>
          <FormField label={t.nationality} error={errors.nationalityCountryId?.message} required>
            <Controller
              control={form.control}
              name="nationalityCountryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {(lookups.data?.countries ?? []).map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {name(x)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.birthDate}>
            <Input type="date" dir="ltr" {...form.register('birthDate')} />
          </FormField>
          <FormField label={t.gender}>
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {LABELS.gender[g][locale]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {isAdmin && (
            <FormField label={t.branch} error={errors.branchId?.message} required={isNew} className="sm:col-span-2">
              <Controller
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {(lookups.data?.branches ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField label={t.notes} className="sm:col-span-2">
            <Textarea rows={2} maxLength={1000} {...form.register('notes')} />
          </FormField>

          {duplicates.length > 0 && (
            <div role="status" className="rounded-field border border-warning/40 bg-warning/10 p-3 text-sm sm:col-span-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4 text-warning" aria-hidden /> {t.duplicate}
              </div>
              <p className="mt-1 text-xs text-muted">{t.duplicateHint}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/customers/${d.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      {d.fullName} · <span className="ltr-nums" dir="ltr">{d.phone}</span> · {d.branch.name}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isNew && (
            <div className="flex flex-col gap-4 rounded-field border border-border p-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={withDoc} onChange={(e) => setWithDoc(e.target.checked)} />
                {t.addDoc}
              </label>
              {withDoc && <DocumentFields value={effDoc} onChange={setDoc} errors={docErrors} />}
            </div>
          )}
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="customer-form" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
