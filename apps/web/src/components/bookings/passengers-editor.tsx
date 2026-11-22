'use client';

import { DOCUMENT_TYPES, type DocumentType } from '@travelos/shared';
import { Plus, Trash2, UserRoundCheck } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import type { Passenger, PassengerInput } from '@/lib/types/bookings';
import type { Customer } from '@/lib/types/customers';
import { bm } from './messages';

export interface PassengerDraft {
  key: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  documentType: DocumentType;
  documentNumber: string;
  notes: string;
}

let seq = 0;
export const emptyPassenger = (): PassengerDraft => ({
  key: `p${++seq}`,
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  documentType: 'NATIONAL_ID',
  documentNumber: '',
  notes: '',
});

export const draftFromPassenger = (p: Passenger): PassengerDraft => ({
  key: p.id,
  fullName: p.fullName,
  dateOfBirth: p.dateOfBirth?.slice(0, 10) ?? '',
  nationality: p.nationality ?? '',
  documentType: p.documentType,
  documentNumber: p.documentNumber ?? '',
  notes: p.notes ?? '',
});

export const draftFromCustomer = (c: Customer, key: string): PassengerDraft => ({
  key,
  fullName: c.fullName,
  dateOfBirth: c.dateOfBirth?.slice(0, 10) ?? '',
  nationality: '',
  documentType: c.nationalId || !c.passportNumber ? 'NATIONAL_ID' : 'PASSPORT',
  documentNumber: c.nationalId ?? c.passportNumber ?? '',
  notes: '',
});

export const passengerValid = (p: PassengerDraft) => p.fullName.trim().length >= 2;

export function toPassengerInput(p: PassengerDraft): PassengerInput {
  const out: PassengerInput = { fullName: p.fullName.trim(), documentType: p.documentType };
  if (p.dateOfBirth) out.dateOfBirth = p.dateOfBirth;
  if (p.nationality.trim()) out.nationality = p.nationality.trim();
  if (p.documentNumber.trim()) out.documentNumber = p.documentNumber.trim();
  if (p.notes.trim()) out.notes = p.notes.trim();
  return out;
}

const today = () => new Date().toISOString().slice(0, 10);

/** One card per traveller. The passenger count is the length of the list. */
export function PassengersEditor({
  value,
  onChange,
  showErrors,
  fixedCount,
  customer,
}: {
  value: PassengerDraft[];
  onChange: (v: PassengerDraft[]) => void;
  showErrors?: boolean;
  /** Confirmed bookings must keep the same number of passengers */
  fixedCount?: boolean;
  customer?: Customer | null;
}) {
  const t = useMessages(bm);
  const update = (i: number, patch: Partial<PassengerDraft>) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const customerIsFirst = !!customer && value[0]?.fullName.trim() === customer.fullName.trim();

  return (
    <div className="grid gap-3">
      {customer && !fixedCount && !customerIsFirst && (
        <Button
          type="button"
          variant="secondary"
          className="justify-self-start"
          onClick={() => {
            const first = value[0];
            const filled = draftFromCustomer(customer, first?.key ?? emptyPassenger().key);
            onChange(first && !first.fullName.trim() ? [filled, ...value.slice(1)] : [filled, ...value]);
          }}
        >
          <UserRoundCheck /> {t.customerTravels}
        </Button>
      )}
      <ol className="grid gap-3">
        {value.map((p, i) => (
          <PassengerRow
            key={p.key}
            index={i}
            p={p}
            onPatch={(patch) => update(i, patch)}
            onRemove={!fixedCount && value.length > 1 ? () => onChange(value.filter((_, j) => j !== i)) : undefined}
            showErrors={showErrors}
          />
        ))}
      </ol>
      {!fixedCount && value.length < 50 && (
        <Button type="button" variant="outline" className="justify-self-start border-dashed" onClick={() => onChange([...value, emptyPassenger()])}>
          <Plus /> {t.addPassenger}
        </Button>
      )}
    </div>
  );
}

function PassengerRow({
  index,
  p,
  onPatch,
  onRemove,
  showErrors,
}: {
  index: number;
  p: PassengerDraft;
  onPatch: (patch: Partial<PassengerDraft>) => void;
  onRemove?: () => void;
  showErrors?: boolean;
}) {
  const t = useMessages(bm);
  const { locale } = useLocale();
  const id = useId();
  const nameError = showErrors && !passengerValid(p) ? t.vName : undefined;
  return (
    <li className="animate-rise rounded-card border border-border bg-surface-raised p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="num grid size-6 place-items-center rounded-full bg-accent-soft text-xs text-primary">{index + 1}</span>
          {fmt(t.passengerN, { n: index + 1 })}
        </span>
        {onRemove && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={fmt(t.removePassenger, { n: index + 1 })} onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <FormField label={t.fullName} required error={nameError} className="sm:col-span-2 lg:col-span-3" id={`${id}-name`}>
          <Input value={p.fullName} autoComplete="off" onChange={(e) => onPatch({ fullName: e.target.value })} />
        </FormField>
        <FormField label={t.documentType} className="lg:col-span-1">
          <Select value={p.documentType} onValueChange={(v) => onPatch({ documentType: v as DocumentType })}>
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
        <FormField label={t.documentNumber} className="lg:col-span-2">
          <Input value={p.documentNumber} dir="ltr" className="text-start" autoComplete="off" maxLength={40} onChange={(e) => onPatch({ documentNumber: e.target.value })} />
        </FormField>
        <FormField label={t.dob} className="lg:col-span-2">
          <Input type="date" value={p.dateOfBirth} max={today()} onChange={(e) => onPatch({ dateOfBirth: e.target.value })} />
        </FormField>
        <FormField label={t.nationality} className="lg:col-span-2">
          <Input value={p.nationality} maxLength={80} autoComplete="off" onChange={(e) => onPatch({ nationality: e.target.value })} />
        </FormField>
        <FormField label={t.notes} className="sm:col-span-2 lg:col-span-2">
          <Input value={p.notes} maxLength={500} autoComplete="off" onChange={(e) => onPatch({ notes: e.target.value })} />
        </FormField>
      </div>
    </li>
  );
}
