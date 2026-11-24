'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { whatsappLink } from '@travelos/shared';
import { ExternalLink, Loader2, MessageCircle, Save } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { QueryState } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useApiMutation, useInvalidate, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import type { SiteSettings } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { ImageField } from './image-upload';

const m = defineMessages({
  ar: {
    identity: 'هوية المكتب',
    identityHint: 'الاسم والشعار والنبذة كما تظهر في الصفحة العامة والوصولات والتقارير المطبوعة.',
    officeName: 'اسم المكتب (عربي)',
    officeNameEn: 'اسم المكتب (إنجليزي)',
    tagline: 'الشعار النصي',
    about: 'نبذة عن المكتب',
    logo: 'الشعار',
    hero: 'صورة الواجهة',
    contact: 'التواصل',
    contactHint: 'تظهر في تذييل الصفحة العامة وعلى الوصولات.',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    facebook: 'فيسبوك',
    instagram: 'إنستغرام',
    whatsapp: 'زر «احجز الآن» على واتساب',
    whatsappHint: 'يفتح الزائر محادثة واتساب مع رسالة جاهزة تحتوي بيانات الرحلة (LND-05).',
    number: 'رقم واتساب',
    numberHint: 'بالصيغة الدولية، أرقام فقط (مثال 963944123456).',
    template: 'نص الرسالة',
    templateHint: 'المتغيرات: {title} العنوان، {code} الرمز، {price} السعر، {link} الرابط.',
    preview: 'معاينة',
    open: 'فتح الرابط',
    sampleTitle: 'استجمام في اللاذقية — 4 أيام',
    operations: 'قواعد التشغيل',
    operationsHint: 'تؤثر في التنبيهات وفي قواعد تأكيد الحجز.',
    currency: 'العملة الافتراضية',
    currencyHint: 'تُقترح للرحلات الجديدة؛ كل رحلة وحجز يحتفظ بعملته.',
    visaDays: 'تنبيه التأشيرات قبل (يوم)',
    visaDaysHint: 'تنبيه عن التأشيرات غير المكتملة للرحلات التي تبدأ خلال هذه المدة.',
    passportMonths: 'صلاحية الجواز المطلوبة (شهر)',
    passportMonthsHint: 'أقل مدة صلاحية متبقية للجواز بعد تاريخ العودة.',
    deadlineDays: 'تنبيه إغلاق التسجيل قبل (يوم)',
    deadlineDaysHint: 'تنبيه عن الرحلات المفتوحة التي يقترب موعد إغلاق تسجيلها.',
    confirmPayment: 'لا يُؤكَّد الحجز قبل تسجيل دفعة',
    confirmPaymentHint:
      'عند التفعيل يرفض النظام تأكيد أي حجز (وحجز مقعده) قبل تسجيل دفعة أولى (عربون) عليه. عند الإلغاء يمكن تأكيد الحجز دون دفع، ويبقى الرصيد مستحقاً في تقرير الأرصدة (قاعدة TBD-07).',
    saved: 'تم حفظ الإعدادات',
    saveSettings: 'حفظ الإعدادات',
    required: 'هذا الحقل مطلوب',
    digits: 'أرقام فقط بالصيغة الدولية (8 إلى 15 رقماً)',
    badEmail: 'بريد إلكتروني غير صالح',
    badUrl: 'رابط غير صالح',
    range: 'القيمة بين {min} و{max}',
    templateMin: 'النص قصير جداً',
  },
  en: {
    identity: 'Office identity',
    identityHint: 'Name, logo and about text as shown on the public site, receipts and printed reports.',
    officeName: 'Office name (Arabic)',
    officeNameEn: 'Office name (English)',
    tagline: 'Tagline',
    about: 'About the office',
    logo: 'Logo',
    hero: 'Hero image',
    contact: 'Contact',
    contactHint: 'Shown in the public site footer and on receipts.',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    facebook: 'Facebook',
    instagram: 'Instagram',
    whatsapp: '“Book now” on WhatsApp',
    whatsappHint: 'Visitors open a WhatsApp chat with a ready message carrying the trip details (LND-05).',
    number: 'WhatsApp number',
    numberHint: 'International format, digits only (e.g. 963944123456).',
    template: 'Message text',
    templateHint: 'Placeholders: {title}, {code}, {price}, {link}.',
    preview: 'Preview',
    open: 'Open link',
    sampleTitle: 'Latakia getaway — 4 days',
    operations: 'Operating rules',
    operationsHint: 'They drive alerts and booking confirmation rules.',
    currency: 'Default currency',
    currencyHint: 'Suggested for new trips; every trip and booking keeps its own currency.',
    visaDays: 'Visa alert (days before)',
    visaDaysHint: 'Alert about incomplete visas for trips starting within this many days.',
    passportMonths: 'Required passport validity (months)',
    passportMonthsHint: 'Minimum validity left on the passport after the return date.',
    deadlineDays: 'Registration deadline alert (days)',
    deadlineDaysHint: 'Alert about open trips whose registration closes soon.',
    confirmPayment: 'Confirm bookings only after a payment',
    confirmPaymentHint:
      'When on, a booking (and its seat) cannot be confirmed until a first payment (deposit) is recorded. When off, bookings can be confirmed unpaid and the balance stays in the outstanding report (rule TBD-07).',
    saved: 'Settings saved',
    saveSettings: 'Save settings',
    required: 'This field is required',
    digits: 'Digits only, international format (8 to 15 digits)',
    badEmail: 'Invalid email',
    badUrl: 'Invalid link',
    range: 'Between {min} and {max}',
    templateMin: 'The text is too short',
  },
});

export function SettingsTab() {
  const q = useResource<SiteSettings>('/cms/settings');
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
      {q.data && <SettingsForm settings={q.data} key={String((q.data as SiteSettings & { updatedAt?: string }).updatedAt ?? '')} />}
    </QueryState>
  );
}

function SettingsForm({ settings }: { settings: SiteSettings }) {
  const t = useMessages(m);
  const f = useFormat();
  const name = useName();
  const lookups = useLookups();
  const qc = useQueryClient();
  const invalidate = useInvalidate();

  const schema = useMemo(() => {
    const intIn = (min: number, max: number) =>
      z.string().refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, { error: t.range.replace('{min}', String(min)).replace('{max}', String(max)) });
    const optUrl = z.string().trim().refine((v) => !v || /^https?:\/\/\S+$/i.test(v), { error: t.badUrl });
    return z.object({
      officeName: z.string().trim().min(2, { error: t.required }),
      officeNameEn: z.string().trim(),
      tagline: z.string().trim().max(255),
      about: z.string().trim().max(5000),
      logoUrl: z.string().nullable(),
      heroImageUrl: z.string().nullable(),
      whatsappNumber: z.string().trim().regex(/^\+?\d{8,15}$/, { error: t.digits }),
      whatsappTemplate: z.string().trim().min(5, { error: t.templateMin }).max(500),
      phone: z.string().trim().max(40),
      email: z.string().trim().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { error: t.badEmail }),
      address: z.string().trim().max(255),
      defaultCurrencyCode: z.string().length(3),
      facebook: optUrl,
      instagram: optUrl,
      visaWarningDays: intIn(1, 120),
      passportValidityMonths: intIn(0, 24),
      deadlineWarningDays: intIn(1, 60),
      confirmRequiresPayment: z.boolean(),
    });
  }, [t]);
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      officeName: settings.officeName,
      officeNameEn: settings.officeNameEn ?? '',
      tagline: settings.tagline ?? '',
      about: settings.about ?? '',
      logoUrl: settings.logoUrl,
      heroImageUrl: settings.heroImageUrl,
      whatsappNumber: settings.whatsappNumber,
      whatsappTemplate: settings.whatsappTemplate,
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      address: settings.address ?? '',
      defaultCurrencyCode: settings.defaultCurrencyCode,
      facebook: settings.socialLinks?.facebook ?? '',
      instagram: settings.socialLinks?.instagram ?? '',
      visaWarningDays: String(settings.visaWarningDays),
      passportValidityMonths: String(settings.passportValidityMonths),
      deadlineWarningDays: String(settings.deadlineWarningDays),
      confirmRequiresPayment: settings.confirmRequiresPayment,
    },
  });

  const save = useApiMutation(
    (v: Values) => {
      const nul = (s: string) => (s.trim() ? s.trim() : null);
      const social: Record<string, string> = { ...(settings.socialLinks ?? {}) };
      for (const k of ['facebook', 'instagram'] as const) {
        if (v[k]) social[k] = v[k];
        else delete social[k];
      }
      return api.patch<SiteSettings>('/cms/settings', {
        officeName: v.officeName,
        officeNameEn: nul(v.officeNameEn),
        tagline: nul(v.tagline),
        about: nul(v.about),
        logoUrl: v.logoUrl,
        heroImageUrl: v.heroImageUrl,
        whatsappNumber: v.whatsappNumber.replace(/^\+/, ''),
        whatsappTemplate: v.whatsappTemplate,
        phone: nul(v.phone),
        email: nul(v.email),
        address: nul(v.address),
        defaultCurrencyCode: v.defaultCurrencyCode,
        socialLinks: social,
        visaWarningDays: Number(v.visaWarningDays),
        passportValidityMonths: Number(v.passportValidityMonths),
        deadlineWarningDays: Number(v.deadlineWarningDays),
        confirmRequiresPayment: v.confirmRequiresPayment,
      });
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await Promise.all([qc.invalidateQueries({ queryKey: ['cms', 'settings'] }), invalidate('/cms/settings')]);
      },
    },
  );

  const errors = form.formState.errors;
  const [number, template, currency] = useWatch({ control: form.control, name: ['whatsappNumber', 'whatsappTemplate', 'defaultCurrencyCode'] });
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = whatsappLink(number || '0', template || '', {
    title: t.sampleTitle,
    code: 'TR-2026-0001',
    price: f.money(2_547_000, currency || 'SYP').replace(/[⁦⁩]/g, ''),
    link: `${origin}/trips/TR-2026-0001`,
  });
  const message = decodeURIComponent(link.split('?text=')[1] ?? '');

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{t.identity}</CardTitle>
              <CardDescription>{t.identityHint}</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <FormField label={t.officeName} error={errors.officeName?.message} required>
              <Input {...form.register('officeName')} />
            </FormField>
            <FormField label={t.officeNameEn} error={errors.officeNameEn?.message}>
              <Input dir="ltr" {...form.register('officeNameEn')} />
            </FormField>
            <FormField label={t.tagline} className="sm:col-span-2" error={errors.tagline?.message}>
              <Input {...form.register('tagline')} />
            </FormField>
            <FormField label={t.about} className="sm:col-span-2" error={errors.about?.message}>
              <Textarea rows={4} {...form.register('about')} />
            </FormField>
          </div>
        </Card>
        <Card>
          <div className="grid gap-5 p-5 sm:p-6">
            <div className="grid gap-2">
              <span className="text-sm font-medium">{t.logo}</span>
              <Controller control={form.control} name="logoUrl" render={({ field }) => <ImageField label={t.logo} value={field.value} onChange={field.onChange} aspect="aspect-[3/1]" fit="contain" />} />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">{t.hero}</span>
              <Controller control={form.control} name="heroImageUrl" render={({ field }) => <ImageField label={t.hero} value={field.value} onChange={field.onChange} />} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t.whatsapp}</CardTitle>
              <CardDescription>{t.whatsappHint}</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 p-5 sm:p-6">
            <FormField label={t.number} hint={t.numberHint} error={errors.whatsappNumber?.message} required>
              <Input dir="ltr" inputMode="numeric" {...form.register('whatsappNumber')} />
            </FormField>
            <FormField label={t.template} hint={t.templateHint} error={errors.whatsappTemplate?.message} required>
              <Textarea rows={4} {...form.register('whatsappTemplate')} />
            </FormField>
            <div className="rounded-tile bg-[color-mix(in_srgb,#25d366_10%,var(--surface-raised))] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-muted uppercase">
                  <MessageCircle className="size-4 text-[#1f9d55]" aria-hidden />
                  {t.preview}
                </span>
                <Button asChild size="xs" variant="secondary">
                  <a href={link} target="_blank" rel="noreferrer">
                    <ExternalLink /> {t.open}
                  </a>
                </Button>
              </div>
              <p className="ms-auto max-w-[85%] rounded-2xl rounded-se-sm bg-surface-raised px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-card">{message}</p>
              <p className="mt-3 line-clamp-2 text-xs break-all text-muted" dir="ltr" title={link}>
                {link}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t.contact}</CardTitle>
              <CardDescription>{t.contactHint}</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <FormField label={t.phone} error={errors.phone?.message}>
              <Input dir="ltr" {...form.register('phone')} />
            </FormField>
            <FormField label={t.email} error={errors.email?.message}>
              <Input dir="ltr" type="email" {...form.register('email')} />
            </FormField>
            <FormField label={t.address} className="sm:col-span-2" error={errors.address?.message}>
              <Input {...form.register('address')} />
            </FormField>
            <FormField label={t.facebook} error={errors.facebook?.message}>
              <Input dir="ltr" placeholder="https://facebook.com/…" {...form.register('facebook')} />
            </FormField>
            <FormField label={t.instagram} error={errors.instagram?.message}>
              <Input dir="ltr" placeholder="https://instagram.com/…" {...form.register('instagram')} />
            </FormField>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t.operations}</CardTitle>
            <CardDescription>{t.operationsHint}</CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          <FormField label={t.currency} hint={t.currencyHint}>
            <Controller
              control={form.control}
              name="defaultCurrencyCode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(lookups.data?.currencies ?? [{ code: field.value, nameAr: field.value, nameEn: field.value, symbol: '', decimals: 2 }]).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="num">{c.code}</span> · {name(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.visaDays} hint={t.visaDaysHint} error={errors.visaWarningDays?.message}>
            <Input dir="ltr" inputMode="numeric" {...form.register('visaWarningDays')} />
          </FormField>
          <FormField label={t.passportMonths} hint={t.passportMonthsHint} error={errors.passportValidityMonths?.message}>
            <Input dir="ltr" inputMode="numeric" {...form.register('passportValidityMonths')} />
          </FormField>
          <FormField label={t.deadlineDays} hint={t.deadlineDaysHint} error={errors.deadlineWarningDays?.message}>
            <Input dir="ltr" inputMode="numeric" {...form.register('deadlineWarningDays')} />
          </FormField>
          <label className="flex items-start gap-3 rounded-tile bg-surface-raised p-4 shadow-card sm:col-span-2 xl:col-span-4">
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" {...form.register('confirmRequiresPayment')} />
            <span>
              <span className="block text-sm font-medium">{t.confirmPayment}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">{t.confirmPaymentHint}</span>
            </span>
          </label>
        </div>
      </Card>

      <div className="sticky bottom-3 z-10 flex justify-end">
        <Button type="submit" size="lg" disabled={save.isPending || !form.formState.isDirty} className="shadow-pop">
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} {t.saveSettings}
        </Button>
      </div>
    </form>
  );
}
