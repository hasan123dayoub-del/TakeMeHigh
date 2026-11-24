'use client';

import { AlertTriangle, Check, Loader2, Search, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useList } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import type { Customer } from '@/lib/types/api';
import { cn } from '@/lib/utils';
import { CustomerDialog } from '../customers/customer-dialog';
import { DocChips, expiryState, useDebounced, useLabel } from '../customers/shared';

const m = defineMessages({
  ar: {
    search: 'ابحث عن عميل بالاسم أو الهاتف أو رقم الوثيقة…',
    newCustomer: 'عميل جديد',
    add: 'إضافة',
    added: 'مُضاف',
    noResults: 'لا يوجد عميل مطابق. أضفه كعميل جديد.',
    typeMore: 'اكتب حرفين على الأقل للبحث.',
    remove: 'إزالة',
    document: 'الوثيقة المستخدمة',
    auto: 'تلقائي حسب قواعد السفر',
    payer: 'الدافع',
    makePayer: 'اجعله الدافع',
    noDocs: 'لا وثائق: لن يكتمل التأكيد قبل إضافة وثيقة',
    expired: 'إحدى الوثائق منتهية',
    empty: 'لم يُضف أي راكب بعد.',
  },
  en: {
    search: 'Search a customer by name, phone or document number…',
    newCustomer: 'New customer',
    add: 'Add',
    added: 'Added',
    noResults: 'No matching customer. Add them as a new customer.',
    typeMore: 'Type at least two characters to search.',
    remove: 'Remove',
    document: 'Travel document',
    auto: 'Automatic (travel rules)',
    payer: 'Payer',
    makePayer: 'Make payer',
    noDocs: 'No documents: confirmation needs a document first',
    expired: 'A document has expired',
    empty: 'No passengers added yet.',
  },
});

export type PickedCustomer = Pick<Customer, 'id' | 'fullName' | 'phone' | 'documents'> & { nationality?: Customer['nationality'] };
export interface PickedPassenger {
  customer: PickedCustomer;
  documentId?: string;
}

/** Search box with inline results. `onPick` receives the chosen customer. */
export function CustomerSearch({
  onPick,
  pickedIds = [],
  allowCreate = true,
  autoFocus,
}: {
  onPick: (c: PickedCustomer) => void;
  pickedIds?: string[];
  allowCreate?: boolean;
  autoFocus?: boolean;
}) {
  const t = useMessages(m);
  const canCreate = useCan('customers.manage');
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useDebounced(text.trim(), 300);
  const list = useList<Customer>('/customers', { search: q, pageSize: 6, isActive: 'true' }, { enabled: q.length >= 2 });

  const pickNew = async (c: Customer) => {
    try {
      // reload so the document added in the same dialog is included
      const full = await api.get<Customer>(`/customers/${c.id}`);
      onPick(full);
    } catch (e) {
      toast.error(errorMessage(e));
      onPick(c);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-10" autoFocus={autoFocus} />
          {list.isFetching && <Loader2 className="absolute end-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-subtle" aria-hidden />}
        </div>
        {allowCreate && canCreate && (
          <Button type="button" variant="secondary" onClick={() => setCreating(true)}>
            <UserPlus /> {t.newCustomer}
          </Button>
        )}
      </div>
      {q.length >= 2 && list.data && (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-field border border-border bg-surface-raised">
          {list.data.data.length === 0 && <li className="p-3 text-sm text-muted">{t.noResults}</li>}
          {list.data.data.map((c) => {
            const picked = pickedIds.includes(c.id);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.fullName}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="ltr-nums" dir="ltr">
                      {c.phone}
                    </span>
                    <span>{c.nationality.nameAr}</span>
                    <span>· {c.branch.name}</span>
                  </div>
                  <div className="mt-1.5">
                    <DocChips docs={c.documents} />
                  </div>
                </div>
                <Button type="button" size="sm" variant={picked ? 'ghost' : 'secondary'} disabled={picked} onClick={() => onPick(c)}>
                  {picked ? <Check /> : <UserPlus />} {picked ? t.added : t.add}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {creating && <CustomerDialog onClose={() => setCreating(false)} onSaved={(c) => void pickNew(c)} />}
    </div>
  );
}

/** Passengers of a booking with their document and (optionally) the payer choice. */
export function PassengerList({
  passengers,
  onChange,
  payerId,
  onPayerChange,
}: {
  passengers: PickedPassenger[];
  onChange: (p: PickedPassenger[]) => void;
  payerId?: string;
  onPayerChange?: (c: PickedCustomer) => void;
}) {
  const t = useMessages(m);
  const label = useLabel();
  if (!passengers.length) return <p className="rounded-field border border-dashed border-border p-5 text-center text-sm text-muted">{t.empty}</p>;
  return (
    <ol className="flex flex-col gap-2">
      {passengers.map((p, i) => {
        const docs = p.customer.documents;
        const anyExpired = docs.some((d) => expiryState(d.expiresOn) === 'expired');
        const isPayer = payerId === p.customer.id;
        return (
          <li key={p.customer.id} className={cn('flex flex-wrap items-center gap-3 rounded-field border p-3', isPayer ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface-raised')}>
            <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-medium">{i + 1}</span>
            <div className="min-w-[180px] flex-1">
              <div className="font-medium">{p.customer.fullName}</div>
              <div className="ltr-nums text-xs text-muted" dir="ltr">
                {p.customer.phone}
              </div>
              {!docs.length && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="size-3.5" aria-hidden /> {t.noDocs}
                </div>
              )}
              {anyExpired && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-danger">
                  <AlertTriangle className="size-3.5" aria-hidden /> {t.expired}
                </div>
              )}
            </div>
            {docs.length > 0 && (
              <div className="w-full sm:w-64">
                <Select
                  value={p.documentId ?? 'auto'}
                  onValueChange={(v) => onChange(passengers.map((x) => (x.customer.id === p.customer.id ? { ...x, documentId: v === 'auto' ? undefined : v } : x)))}
                >
                  <SelectTrigger size="sm" aria-label={t.document}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t.auto}</SelectItem>
                    {docs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {label('documentType', d.docType)} {d.docNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {onPayerChange && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                <input type="radio" name="payer" className="size-4 accent-[var(--primary)]" checked={isPayer} onChange={() => onPayerChange(p.customer)} />
                {t.payer}
              </label>
            )}
            <Button type="button" size="icon-sm" variant="ghost" aria-label={`${t.remove} ${p.customer.fullName}`} onClick={() => onChange(passengers.filter((x) => x.customer.id !== p.customer.id))}>
              <X />
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
