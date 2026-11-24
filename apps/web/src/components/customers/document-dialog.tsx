'use client';

import { DOCUMENT_TYPES, LABELS, type DocumentType } from '@travelos/shared';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useApiMutation, useInvalidate, useLookups, useName } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { CustomerDocument } from '@/lib/types/api';
import { dateInput, useSyriaId } from './shared';

export const docMessages = defineMessages({
  ar: {
    docType: 'نوع الوثيقة',
    docNumber: 'رقم الوثيقة',
    issuingCountry: 'جهة الإصدار (الدولة)',
    issuedOn: 'تاريخ الإصدار',
    expiresOn: 'تاريخ الانتهاء',
    required: 'هذا الحقل مطلوب',
    numberShort: 'الرقم قصير جداً (3 أحرف على الأقل)',
    syrianId: 'الهوية السورية تصدر عن سوريا فقط',
    datesOrder: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار',
    newTitle: 'وثيقة جديدة',
    editTitle: 'تعديل الوثيقة',
    hint: 'تُستخدم الوثائق للتحقق من شروط السفر (هوية للرحلات الداخلية، جواز ساري 6 أشهر بعد الرحلة للخارجية).',
    saved: 'تم حفظ الوثيقة',
  },
  en: {
    docType: 'Document type',
    docNumber: 'Document number',
    issuingCountry: 'Issuing country',
    issuedOn: 'Issued on',
    expiresOn: 'Expires on',
    required: 'This field is required',
    numberShort: 'The number is too short (at least 3 characters)',
    syrianId: 'A Syrian ID is issued by Syria only',
    datesOrder: 'The expiry date must be after the issue date',
    newTitle: 'New document',
    editTitle: 'Edit document',
    hint: 'Documents are checked against the travel rules (ID for domestic trips, a passport valid 6 months after the trip for international ones).',
    saved: 'Document saved',
  },
});

export interface DocDraft {
  docType: DocumentType;
  docNumber: string;
  issuingCountryId: string;
  issuedOn: string;
  expiresOn: string;
}
export type DocErrors = Partial<Record<keyof DocDraft, string>>;

export function emptyDoc(syriaId: string): DocDraft {
  return { docType: 'SYRIAN_ID', docNumber: '', issuingCountryId: syriaId, issuedOn: '', expiresOn: '' };
}

/** Client checks that mirror the API (CUS-02): the API still has the last word. */
export function validateDoc(d: DocDraft, t: (typeof docMessages)['ar'], syriaId: string): DocErrors {
  const e: DocErrors = {};
  if (d.docNumber.trim().length < 3) e.docNumber = d.docNumber.trim() ? t.numberShort : t.required;
  if (!d.issuingCountryId) e.issuingCountryId = t.required;
  else if (d.docType === 'SYRIAN_ID' && syriaId && d.issuingCountryId !== syriaId) e.issuingCountryId = t.syrianId;
  if (d.issuedOn && d.expiresOn && d.expiresOn <= d.issuedOn) e.expiresOn = t.datesOrder;
  return e;
}

export function docBody(d: DocDraft) {
  return {
    docType: d.docType,
    docNumber: d.docNumber.trim().toUpperCase(),
    issuingCountryId: d.issuingCountryId,
    issuedOn: d.issuedOn || undefined,
    expiresOn: d.expiresOn || undefined,
  };
}

/** Controlled document fields (used in the document dialog and in the new-customer flow). */
export function DocumentFields({ value, onChange, errors }: { value: DocDraft; onChange: (v: DocDraft) => void; errors: DocErrors }) {
  const t = useMessages(docMessages);
  const { locale } = useLocale();
  const lookups = useLookups();
  const name = useName();
  const syriaId = useSyriaId();
  const set = (patch: Partial<DocDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label={t.docType} required>
        <Select
          value={value.docType}
          onValueChange={(v) => {
            const docType = v as DocumentType;
            set({ docType, issuingCountryId: docType === 'SYRIAN_ID' ? syriaId : value.issuingCountryId });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((d) => (
              <SelectItem key={d} value={d}>
                {LABELS.documentType[d][locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label={t.docNumber} error={errors.docNumber} required>
        <Input dir="ltr" className="uppercase" value={value.docNumber} onChange={(e) => set({ docNumber: e.target.value })} maxLength={60} />
      </FormField>
      <FormField label={t.issuingCountry} error={errors.issuingCountryId} required className="sm:col-span-2">
        <Select value={value.issuingCountryId} onValueChange={(v) => set({ issuingCountryId: v })} disabled={value.docType === 'SYRIAN_ID'}>
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {(lookups.data?.countries ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {name(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label={t.issuedOn} error={errors.issuedOn}>
        <Input type="date" dir="ltr" value={value.issuedOn} onChange={(e) => set({ issuedOn: e.target.value })} />
      </FormField>
      <FormField label={t.expiresOn} error={errors.expiresOn}>
        <Input type="date" dir="ltr" value={value.expiresOn} onChange={(e) => set({ expiresOn: e.target.value })} />
      </FormField>
    </div>
  );
}

/** Add or edit one document of a customer (CUS-02). */
export function DocumentDialog({ customerId, doc, onClose }: { customerId: string; doc: CustomerDocument | null; onClose: () => void }) {
  const t = useMessages(docMessages);
  const c = useMessages(common);
  const syriaId = useSyriaId();
  const invalidate = useInvalidate();
  const [draft, setDraft] = useState<DocDraft>(() =>
    doc
      ? { docType: doc.docType, docNumber: doc.docNumber, issuingCountryId: doc.issuingCountryId ?? '', issuedOn: dateInput(doc.issuedOn), expiresOn: dateInput(doc.expiresOn) }
      : emptyDoc(syriaId),
  );
  const [errors, setErrors] = useState<DocErrors>({});
  const effective = !draft.issuingCountryId && draft.docType === 'SYRIAN_ID' ? { ...draft, issuingCountryId: syriaId } : draft;

  const save = useApiMutation(
    (d: DocDraft) => (doc ? api.patch(`/customers/${customerId}/documents/${doc.id}`, docBody(d)) : api.post(`/customers/${customerId}/documents`, docBody(d))),
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/customers');
        onClose();
      },
    },
  );

  const submit = () => {
    const e = validateDoc(effective, t, syriaId);
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate(effective);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{doc ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{t.hint}</DialogDescription>
        </DialogHeader>
        <form
          id="doc-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <DocumentFields value={effective} onChange={setDraft} errors={errors} />
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="doc-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
