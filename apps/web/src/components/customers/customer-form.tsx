'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowUpRight, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, errorMessage } from '@/lib/api';
import { fmt, useMessages } from '@/lib/i18n';
import { findCustomerByPhone, useSaveCustomer } from '@/lib/queries/customers';
import type { Customer, CustomerInput } from '@/lib/types/customers';
import { cm } from './messages';

const PHONE = /^[+\d][\d\s()-]{5,39}$/;
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Create / edit a customer. On a 409 (phone already used in this office) it looks the existing
 * customer up and offers to use it (inside the booking flow) or to open their profile.
 */
export function CustomerForm({
  customer,
  onSaved,
  onPickExisting,
  footer,
  withNotes = true,
  autoFocus = true,
}: {
  customer?: Customer;
  onSaved: (c: Customer) => void;
  onPickExisting?: (c: Customer) => void;
  /** Renders the action row; receives the submit button. */
  footer?: (submit: ReactNode) => ReactNode;
  withNotes?: boolean;
  autoFocus?: boolean;
}) {
  const t = useMessages(cm);
  const save = useSaveCustomer(customer?.id);
  const [existing, setExisting] = useState<Customer | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(2, { error: t.vName }).max(160),
        phone: z.string().trim().regex(PHONE, { error: t.vPhone }),
        nationalId: z.string().trim().max(40),
        passportNumber: z.string().trim().max(40),
        dateOfBirth: z.string().refine((v) => !v || v <= today(), { error: t.vDob }),
        address: z.string().trim().max(255),
        notes: z.string().trim().max(3000),
      }),
    [t],
  );
  type Values = z.input<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      fullName: customer?.fullName ?? '',
      phone: customer?.phone ?? '',
      nationalId: customer?.nationalId ?? '',
      passportNumber: customer?.passportNumber ?? '',
      dateOfBirth: customer?.dateOfBirth?.slice(0, 10) ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    setExisting(null);
    setServerError(null);
    const input: CustomerInput = { fullName: v.fullName.trim(), phone: v.phone.trim() };
    for (const k of ['nationalId', 'passportNumber', 'dateOfBirth', 'address', 'notes'] as const) {
      const val = v[k]?.trim();
      if (val) input[k] = val;
      // When editing, an emptied text field is cleared (a date can't be sent empty, so it stays).
      else if (customer && k !== 'dateOfBirth' && customer[k]) input[k] = '';
    }
    try {
      const saved = await save.mutateAsync(input);
      toast.success(customer ? t.saved : t.created);
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        setServerError(errorMessage(err));
        const found = await findCustomerByPhone(v.phone).catch(() => null);
        if (found && found.id !== customer?.id) setExisting(found);
      } else {
        setServerError(errorMessage(err));
      }
    }
  });

  const submit = (
    <Button type="submit" loading={save.isPending}>
      {t.save}
    </Button>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.fullName} required error={errors.fullName?.message}>
          <Input autoComplete="off" autoFocus={autoFocus} {...register('fullName')} />
        </FormField>
        <FormField label={t.phone} required error={errors.phone?.message} hint={t.phoneHint}>
          <Input type="tel" dir="ltr" inputMode="tel" autoComplete="off" placeholder="+963 9xx xxx xxx" className="text-start" {...register('phone')} />
        </FormField>
        <FormField label={t.nationalId} error={errors.nationalId?.message}>
          <Input dir="ltr" autoComplete="off" className="text-start" {...register('nationalId')} />
        </FormField>
        <FormField label={t.passport} error={errors.passportNumber?.message}>
          <Input dir="ltr" autoComplete="off" className="text-start" {...register('passportNumber')} />
        </FormField>
        <FormField label={t.dob} error={errors.dateOfBirth?.message}>
          <Input type="date" max={today()} {...register('dateOfBirth')} />
        </FormField>
        <FormField label={t.address} error={errors.address?.message}>
          <Input autoComplete="off" {...register('address')} />
        </FormField>
      </div>
      {withNotes && (
        <FormField label={t.notes} error={errors.notes?.message}>
          <Textarea rows={2} className="min-h-16" {...register('notes')} />
        </FormField>
      )}

      {serverError && (
        <div role="alert" className="flex flex-col gap-3 rounded-tile border border-danger/30 bg-danger/8 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              {existing ? t.phoneExists : null} <span dir="auto">{serverError}</span>
            </span>
          </p>
          {existing &&
            (onPickExisting ? (
              <Button type="button" size="sm" variant="ink" onClick={() => onPickExisting(existing)}>
                <UserCheck /> {fmt(t.useExisting, { name: existing.fullName })}
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/dashboard/customers/${existing.id}`}>
                  {fmt(t.openExisting, { name: existing.fullName })} <ArrowUpRight className="rtl-flip" />
                </Link>
              </Button>
            ))}
        </div>
      )}

      {footer ? footer(submit) : <div className="flex justify-end">{submit}</div>}
    </form>
  );
}
