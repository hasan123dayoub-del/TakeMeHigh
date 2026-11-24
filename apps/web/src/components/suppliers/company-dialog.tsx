'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LABELS, TRANSPORT_MODES, type TransportMode } from '@travelos/shared';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useApiMutation, useInvalidate, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Company, Service } from '@/lib/types/api';

const NONE = '__none__';

const m = defineMessages({
  ar: {
    newTitle: 'شركة جديدة',
    editTitle: 'تعديل الشركة',
    hint: 'الدولة إلزامية لكل شركة (BR-16). شركات النقل تحتاج نوع النقل: برّي أو بحري أو جوّي (SUP-03).',
    name: 'اسم الشركة',
    service: 'الخدمة',
    serviceLocked: 'لا يمكن تغيير خدمة شركة بعد إنشائها.',
    country: 'الدولة',
    city: 'المدينة',
    noCity: 'بدون مدينة',
    mode: 'نوع النقل',
    modeRequired: 'اختر نوع النقل لشركة النقل (SUP-03)',
    contactName: 'اسم المسؤول',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    description: 'الوصف',
    rating: 'التصنيف (نجوم)',
    noRating: 'بدون تصنيف',
    required: 'هذا الحقل مطلوب',
    emailInvalid: 'بريد إلكتروني غير صالح',
    saved: 'تم حفظ الشركة',
  },
  en: {
    newTitle: 'New company',
    editTitle: 'Edit company',
    hint: 'Every company needs a country (BR-16). Transport companies need a mode: land, sea or air (SUP-03).',
    name: 'Company name',
    service: 'Service',
    serviceLocked: 'A company’s service cannot change after it is created.',
    country: 'Country',
    city: 'City',
    noCity: 'No city',
    mode: 'Transport mode',
    modeRequired: 'Choose the transport mode (SUP-03)',
    contactName: 'Contact person',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    description: 'Description',
    rating: 'Rating (stars)',
    noRating: 'No rating',
    required: 'This field is required',
    emailInvalid: 'Invalid email address',
    saved: 'Company saved',
  },
});

/** Create / edit a supplier company (SUP-02, SUP-03, BR-16). */
export function CompanyDialog({ company, onClose }: { company: Company | null; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const name = useName();
  const lookups = useLookups();
  const services = useResource<Service[]>('/services');
  const invalidate = useInvalidate();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, { error: t.required }),
        serviceId: z.string().min(1, { error: t.required }),
        countryId: z.string().min(1, { error: t.required }),
        cityId: z.string(),
        transportMode: z.string(),
        contactName: z.string().trim(),
        phone: z.string().trim(),
        email: z.string().trim().email({ error: t.emailInvalid }).or(z.literal('')),
        address: z.string().trim(),
        description: z.string().trim(),
        rating: z.string(),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name ?? '',
      serviceId: company?.serviceId ?? '',
      countryId: company?.countryId ?? '',
      cityId: company?.cityId ?? '',
      transportMode: company?.transportMode ?? '',
      contactName: company?.contactName ?? '',
      phone: company?.phone ?? '',
      email: company?.email ?? '',
      address: company?.address ?? '',
      description: company?.description ?? '',
      rating: company?.rating ? String(company.rating) : '',
    },
  });

  const serviceId = useWatch({ control: form.control, name: 'serviceId' });
  const countryId = useWatch({ control: form.control, name: 'countryId' });
  const allServices = services.data ?? [];
  const kind = allServices.find((s) => s.id === serviceId)?.kind ?? company?.service.kind;
  const isTransport = kind === 'TRANSPORT';
  const cities = (lookups.data?.cities ?? []).filter((x) => x.countryId === countryId);

  const save = useApiMutation(
    (v: Values) => {
      // empty optional fields: omit on create, clear (null) on edit
      const opt = (s: string) => (s ? s : company ? null : undefined);
      const body = {
        name: v.name,
        countryId: v.countryId,
        cityId: opt(v.cityId),
        transportMode: isTransport ? (v.transportMode as TransportMode) : undefined,
        contactName: opt(v.contactName),
        phone: opt(v.phone),
        email: opt(v.email),
        address: opt(v.address),
        description: opt(v.description),
        rating: kind === 'HOTEL' && v.rating ? Number(v.rating) : company && kind === 'HOTEL' ? null : undefined,
      };
      return company ? api.patch<Company>(`/companies/${company.id}`, body) : api.post<Company>('/companies', { ...body, serviceId: v.serviceId });
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/companies', '/integrations', '/catalog');
        onClose();
      },
    },
  );

  const submit = form.handleSubmit((v) => {
    if (isTransport && !v.transportMode) {
      form.setError('transportMode', { message: t.modeRequired });
      return;
    }
    save.mutate(v);
  });

  const errors = form.formState.errors;
  // a new company can only use an active service; an existing one keeps its own
  const serviceOptions = allServices.filter((s) => s.isActive || s.id === company?.serviceId);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{company ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{t.hint}</DialogDescription>
        </DialogHeader>
        <form id="company-form" onSubmit={submit} className="grid max-h-[65vh] gap-4 overflow-y-auto px-0.5 sm:grid-cols-2" noValidate>
          <FormField label={t.name} error={errors.name?.message} required className="sm:col-span-2">
            <Input {...form.register('name')} autoFocus />
          </FormField>
          <FormField label={t.service} error={errors.serviceId?.message} required hint={company ? t.serviceLocked : undefined}>
            <Controller
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  disabled={!!company}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue('transportMode', '');
                    form.clearErrors('transportMode');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {name(s)} · {LABELS.serviceKind[s.kind][locale]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {isTransport ? (
            <FormField label={t.mode} error={errors.transportMode?.message} required>
              <Controller
                control={form.control}
                name="transportMode"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.clearErrors('transportMode');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSPORT_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {LABELS.transportMode[mode][locale]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          ) : kind === 'HOTEL' ? (
            <FormField label={t.rating}>
              <Controller
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t.noRating}</SelectItem>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <SelectItem key={r} value={String(r)}>
                          {'★'.repeat(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          ) : (
            <div className="hidden sm:block" />
          )}
          <FormField label={t.country} error={errors.countryId?.message} required>
            <Controller
              control={form.control}
              name="countryId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue('cityId', '');
                  }}
                >
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
          <FormField label={t.city}>
            <Controller
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? '' : v)} disabled={!countryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t.noCity}</SelectItem>
                    {cities.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {name(x)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.contactName}>
            <Input {...form.register('contactName')} />
          </FormField>
          <FormField label={t.phone}>
            <Input dir="ltr" inputMode="tel" {...form.register('phone')} />
          </FormField>
          <FormField label={t.email} error={errors.email?.message}>
            <Input dir="ltr" type="email" {...form.register('email')} />
          </FormField>
          <FormField label={t.address}>
            <Input {...form.register('address')} />
          </FormField>
          <FormField label={t.description} className="sm:col-span-2">
            <Textarea rows={3} maxLength={1000} {...form.register('description')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="company-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
