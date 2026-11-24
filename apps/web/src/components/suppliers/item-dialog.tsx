'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useApiMutation, useInvalidate, useLookups, useName } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Company, CompanyItem } from '@/lib/types/api';

const NONE = '__none__';
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

const m = defineMessages({
  ar: {
    newTitle: 'بند جديد',
    editTitle: 'تعديل البند',
    hint: 'البند هو ما تبيعه الشركة: غرفة، مقعد على خط، وجبة… مع كلفته للشخص بعملته.',
    name: 'اسم البند',
    description: 'الوصف',
    from: 'من مدينة',
    to: 'إلى مدينة',
    city: 'المدينة',
    noCity: 'بدون مدينة',
    cost: 'الكلفة للشخص',
    costHint: 'مبلغ بخانتين عشريتين كحد أقصى، مثال 200000 أو 45.50',
    currency: 'العملة',
    integrationNote: 'الكلفة تأتي من المورّد (SUP-06)',
    integrationBody: 'هذا البند يُحدَّث من منصة المورّد عند كل مزامنة، لذلك لا تُعدَّل كلفته وعملته يدوياً.',
    required: 'هذا الحقل مطلوب',
    amountInvalid: 'أدخل مبلغاً صحيحاً بخانتين عشريتين كحد أقصى',
    sameCity: 'يجب أن تختلف مدينة الانطلاق عن مدينة الوصول',
    saved: 'تم حفظ البند',
  },
  en: {
    newTitle: 'New item',
    editTitle: 'Edit item',
    hint: 'An item is what the company sells: a room, a seat on a route, a meal… with its cost per person in its currency.',
    name: 'Item name',
    description: 'Description',
    from: 'From city',
    to: 'To city',
    city: 'City',
    noCity: 'No city',
    cost: 'Cost per person',
    costHint: 'Amount with up to 2 decimals, e.g. 200000 or 45.50',
    currency: 'Currency',
    integrationNote: 'The cost comes from the supplier (SUP-06)',
    integrationBody: 'This item is refreshed from the supplier platform on every sync, so its cost and currency cannot be edited by hand.',
    required: 'This field is required',
    amountInvalid: 'Enter an amount with up to 2 decimals',
    sameCity: 'Departure and arrival must be different cities',
    saved: 'Item saved',
  },
});

/** Add / edit a company item (SUP-05). Integration items keep the supplier's cost (SUP-06). */
export function ItemDialog({ company, item, onClose }: { company: Company; item: CompanyItem | null; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const name = useName();
  const lookups = useLookups();
  const invalidate = useInvalidate();
  const isTransport = company.service.kind === 'TRANSPORT';
  const fromIntegration = item?.source === 'INTEGRATION';
  // roles without pricing.view_breakdown get costPerPerson = null (PRC-06); they never edit costs
  const costHidden = !!item && item.costPerPerson === null;
  const lockCost = fromIntegration || costHidden;

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(2, { error: t.required }),
          description: z.string().trim(),
          fromCityId: z.string(),
          toCityId: z.string(),
          costPerPerson: z.string().trim(),
          currencyCode: z.string(),
        })
        .superRefine((v, ctx) => {
          if (isTransport) {
            if (!v.fromCityId) ctx.addIssue({ code: 'custom', message: t.required, path: ['fromCityId'] });
            if (!v.toCityId) ctx.addIssue({ code: 'custom', message: t.required, path: ['toCityId'] });
            if (v.fromCityId && v.fromCityId === v.toCityId) ctx.addIssue({ code: 'custom', message: t.sameCity, path: ['toCityId'] });
          }
          if (!lockCost) {
            if (!AMOUNT.test(v.costPerPerson)) ctx.addIssue({ code: 'custom', message: t.amountInvalid, path: ['costPerPerson'] });
            if (!v.currencyCode) ctx.addIssue({ code: 'custom', message: t.required, path: ['currencyCode'] });
          }
        }),
    [t, isTransport, lockCost],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      fromCityId: item?.fromCityId ?? '',
      toCityId: item?.toCityId ?? '',
      costPerPerson: item?.costPerPerson ?? '',
      currencyCode: item?.currencyCode ?? '',
    },
  });

  const save = useApiMutation(
    (v: Values) => {
      const body = {
        name: v.name,
        description: v.description || (item ? null : undefined),
        fromCityId: isTransport ? v.fromCityId : undefined,
        toCityId: v.toCityId || (item ? null : undefined),
        ...(lockCost ? {} : { costPerPerson: v.costPerPerson, currencyCode: v.currencyCode }),
      };
      return item ? api.patch<CompanyItem>(`/items/${item.id}`, body) : api.post<CompanyItem>(`/companies/${company.id}/items`, body);
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate(`/companies/${company.id}`, '/catalog');
        onClose();
      },
    },
  );

  const errors = form.formState.errors;
  const cities = lookups.data?.cities ?? [];
  const citySelect = (field: 'fromCityId' | 'toCityId', allowEmpty: boolean) => (
    <Controller
      control={form.control}
      name={field}
      render={({ field: f }) => (
        <Select value={f.value || (allowEmpty ? NONE : undefined)} onValueChange={(v) => f.onChange(v === NONE ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {allowEmpty && <SelectItem value={NONE}>{t.noCity}</SelectItem>}
            {cities.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {name(x)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{t.hint}</DialogDescription>
        </DialogHeader>
        <form id="item-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField label={t.name} error={errors.name?.message} required className="sm:col-span-2">
            <Input {...form.register('name')} autoFocus />
          </FormField>
          {isTransport ? (
            <>
              <FormField label={t.from} error={errors.fromCityId?.message} required>
                {citySelect('fromCityId', false)}
              </FormField>
              <FormField label={t.to} error={errors.toCityId?.message} required>
                {citySelect('toCityId', false)}
              </FormField>
            </>
          ) : (
            <FormField label={t.city} error={errors.toCityId?.message} className="sm:col-span-2">
              {citySelect('toCityId', true)}
            </FormField>
          )}
          {fromIntegration && (
            <div className="flex items-start gap-2 rounded-field bg-info/10 p-3 text-sm sm:col-span-2" role="note">
              <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
              <div>
                <p className="font-medium">{t.integrationNote}</p>
                <p className="text-muted">{t.integrationBody}</p>
              </div>
            </div>
          )}
          {!costHidden && (
            <>
              <FormField label={t.cost} error={errors.costPerPerson?.message} hint={lockCost ? undefined : t.costHint} required={!lockCost}>
                <Input dir="ltr" inputMode="decimal" className="num" disabled={lockCost} {...form.register('costPerPerson')} />
              </FormField>
              <FormField label={t.currency} error={errors.currencyCode?.message} required={!lockCost}>
                <Controller
                  control={form.control}
                  name="currencyCode"
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange} disabled={lockCost}>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {(lookups.data?.currencies ?? []).map((x) => (
                          <SelectItem key={x.code} value={x.code}>
                            {x.code} · {name(x)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </>
          )}
          <FormField label={t.description} className="sm:col-span-2">
            <Textarea rows={3} maxLength={500} {...form.register('description')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="item-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
