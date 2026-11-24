'use client';

import { LABELS, type TransportMode } from '@travelos/shared';
import { AlertCircle, Check, CheckCircle2, CircleDashed, Copy, Plus, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { fmt, useLocale, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SERVICE_ICON, TRANSPORT_ICON, WhatsAppIcon } from './icons';
import { landingMessages } from './messages';
import type { RequestOptions } from './types';
import { chatLink, nameOf } from './utils';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');
const OTHER = '__other';
const NONE = '__none';
const CORE = ['HOTEL', 'TRANSPORT', 'RESTAURANT'] as const;
type Core = (typeof CORE)[number];

interface ServiceState {
  on: boolean;
  companyId: string;
  otherText: string;
  mode: TransportMode | '';
}

type Errors = Partial<Record<string, string>>;

const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Damascus' }).format(new Date());

export function DesignTripForm({ options, officeName, whatsappNumber }: { options: RequestOptions; officeName: string; whatsappNumber: string | null }) {
  const t = useMessages(landingMessages);
  const { locale, dir } = useLocale();
  const reduce = useReducedMotion();

  const [form, setForm] = useState({
    contactName: '',
    contactPhone: '',
    passengersCount: '2',
    desiredFrom: '',
    desiredTo: '',
    originCityId: '',
    destinationCityId: '',
    categoryId: '',
    branchId: '',
    message: '',
    website: '',
  });
  const [services, setServices] = useState<Record<Core, ServiceState>>({
    HOTEL: { on: true, companyId: '', otherText: '', mode: '' },
    TRANSPORT: { on: true, companyId: '', otherText: '', mode: '' },
    RESTAURANT: { on: false, companyId: '', otherText: '', mode: '' },
  });
  const [errors, setErrors] = useState<Errors>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ requestNo: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const serviceByKind = useMemo(() => new Map(options.services.map((s) => [s.kind, s])), [options.services]);
  const citiesByCountry = useMemo(() => {
    const groups = new Map<string, RequestOptions['cities']>();
    for (const c of options.cities) groups.set(c.country.nameAr, [...(groups.get(c.country.nameAr) ?? []), c]);
    return [...groups.entries()];
  }, [options.cities]);

  const available = CORE.filter((k) => serviceByKind.has(k));
  const selectedCount = available.filter((k) => services[k].on).length;
  const minServices = options.minServices || 2;
  const ruleOk = selectedCount >= minServices;

  const setField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setService = (kind: Core, patch: Partial<ServiceState>) => {
    setServices((s) => ({ ...s, [kind]: { ...s[kind], ...patch } }));
    setErrors((e) => ({ ...e, [`${kind}.company`]: undefined, [`${kind}.other`]: undefined, [`${kind}.mode`]: undefined, services: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    if (form.contactName.trim().length < 3) e.contactName = t.nameMin;
    if (!/^\+?[0-9 ()-]{7,20}$/.test(form.contactPhone.trim())) e.contactPhone = form.contactPhone ? t.phoneInvalid : t.required;
    const n = Number(form.passengersCount);
    if (!Number.isInteger(n) || n < 1 || n > 500) e.passengersCount = t.passengersInvalid;
    if (!form.desiredFrom) e.desiredFrom = t.required;
    else if (form.desiredFrom < todayKey()) e.desiredFrom = t.datePast;
    if (!form.desiredTo) e.desiredTo = t.required;
    else if (form.desiredFrom && form.desiredTo < form.desiredFrom) e.desiredTo = t.dateOrder;
    if (!form.originCityId) e.originCityId = t.required;
    if (!form.destinationCityId) e.destinationCityId = t.required;
    else if (form.destinationCityId === form.originCityId) e.destinationCityId = t.sameCity;
    for (const k of available) {
      const s = services[k];
      if (!s.on) continue;
      if (k === 'TRANSPORT' && !s.mode) e[`${k}.mode`] = t.modeRequired;
      if (!s.companyId) e[`${k}.company`] = t.companyRequired;
      else if (s.companyId === OTHER && s.otherText.trim().length < 2) e[`${k}.other`] = t.otherMin;
    }
    if (!ruleOk) e.services = t.minServicesError;
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setApiErrors([]);
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      const first = Object.keys(e).find((k) => e[k]);
      const el = first ? document.querySelector<HTMLElement>(`[data-field="${first}"] :is(input,button,textarea)`) : null;
      el?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const items = available
        .filter((k) => services[k].on)
        .map((k) => {
          const s = services[k];
          return {
            serviceId: serviceByKind.get(k)!.id,
            ...(s.companyId === OTHER ? { otherText: s.otherText.trim() } : { companyId: s.companyId }),
            ...(k === 'TRANSPORT' && s.mode ? { transportMode: s.mode } : {}),
          };
        });
      const body = {
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        passengersCount: Number(form.passengersCount),
        desiredFrom: form.desiredFrom,
        desiredTo: form.desiredTo,
        originCityId: form.originCityId,
        destinationCityId: form.destinationCityId,
        ...(form.categoryId ? { categoryId: form.categoryId } : {}),
        ...(form.branchId ? { branchId: form.branchId } : {}),
        ...(form.message.trim() ? { message: form.message.trim() } : {}),
        ...(form.website ? { website: form.website } : {}),
        items,
      };
      const res = await fetch(`${API}/public/requests`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { requestNo?: string; message?: string | string[] };
      if (res.status === 429) {
        setApiErrors([t.tooMany]);
      } else if (!res.ok) {
        const m = json.message;
        setApiErrors(Array.isArray(m) ? m : [m || t.networkError]);
      } else {
        setDone({ requestNo: json.requestNo ?? '', name: body.contactName });
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }
    } catch {
      setApiErrors([t.networkError]);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const follow = chatLink(whatsappNumber, fmt(t.followUpMessage, { no: done.requestNo, name: done.name }));
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center px-2 py-10 text-center sm:py-16"
        role="status"
      >
        <span className="relative grid size-20 place-items-center rounded-full bg-success/15 text-success">
          <span aria-hidden className="absolute inset-[-10px] rounded-full border border-success/25" />
          <CheckCircle2 className="size-9" aria-hidden />
        </span>
        <h2 className="heading-display mt-7 text-[30px] leading-tight sm:text-[38px]">
          <strong className="font-medium">{t.successTitle}</strong>
        </h2>
        <p className="mt-3 max-w-md text-[15px] text-muted">{fmt(t.successBody, { office: officeName })}</p>
        {done.requestNo && (
          <div className="mt-8 rounded-card border border-border bg-surface-raised px-8 py-5 shadow-card">
            <p className="eyebrow">{t.requestNo}</p>
            <p className="mt-2 flex items-center gap-3">
              <span className="font-display text-[28px] font-medium tracking-wider num" dir="ltr">
                {done.requestNo}
              </span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(done.requestNo);
                  setCopied(true);
                }}
                aria-label={t.requestNo}
                className="grid size-9 place-items-center rounded-full border border-border text-muted hover:text-foreground"
              >
                {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              </button>
            </p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {follow && (
            <Button asChild size="lg">
              <a href={follow} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-5" />
                {t.followUp}
              </a>
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setDone(null);
              setCopied(false);
              setForm((f) => ({ ...f, message: '', desiredFrom: '', desiredTo: '' }));
            }}
          >
            <RotateCcw aria-hidden />
            {t.newRequest}
          </Button>
        </div>
      </motion.div>
    );
  }

  const citySelect = (key: 'originCityId' | 'destinationCityId', label: string) => (
    <div data-field={key}>
      <FormField label={label} required error={errors[key]}>
        <Select dir={dir} value={form[key] || undefined} onValueChange={(v) => setField(key, v)}>
          <SelectTrigger className="text-start">
            <SelectValue placeholder={t.chooseCity} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {citiesByCountry.map(([country, list]) => (
              <SelectGroup key={country}>
                <SelectLabel>{country}</SelectLabel>
                {list.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {nameOf(c, locale)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-10">
      {apiErrors.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-tile border border-danger/25 bg-danger/8 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="font-medium text-danger">{t.errorsTitle}</p>
            <ul className="mt-1.5 grid list-disc gap-1 ps-4 text-foreground/90" dir="auto">
              {apiErrors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <FormSection n={1} title={t.sectionContact}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-field="contactName">
            <FormField label={t.contactName} required error={errors.contactName}>
              <Input value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} autoComplete="name" maxLength={120} />
            </FormField>
          </div>
          <div data-field="contactPhone">
            <FormField label={t.contactPhone} required error={errors.contactPhone} hint={t.phoneHint}>
              <Input
                type="tel"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                value={form.contactPhone}
                onChange={(e) => setField('contactPhone', e.target.value)}
                className="text-start rtl:text-end"
                maxLength={20}
              />
            </FormField>
          </div>
        </div>
      </FormSection>

      <FormSection n={2} title={t.sectionTrip}>
        <div className="grid gap-4 sm:grid-cols-2">
          {citySelect('originCityId', t.origin)}
          {citySelect('destinationCityId', t.destination)}
          <div data-field="desiredFrom">
            <FormField label={t.desiredFrom} required error={errors.desiredFrom}>
              <Input type="date" dir="ltr" min={todayKey()} value={form.desiredFrom} onChange={(e) => setField('desiredFrom', e.target.value)} className="num rtl:text-end" />
            </FormField>
          </div>
          <div data-field="desiredTo">
            <FormField label={t.desiredTo} required error={errors.desiredTo}>
              <Input
                type="date"
                dir="ltr"
                min={form.desiredFrom || todayKey()}
                value={form.desiredTo}
                onChange={(e) => setField('desiredTo', e.target.value)}
                className="num rtl:text-end"
              />
            </FormField>
          </div>
          <div data-field="passengersCount">
            <FormField label={t.passengers} required error={errors.passengersCount}>
              <Input
                type="number"
                dir="ltr"
                inputMode="numeric"
                min={1}
                max={500}
                value={form.passengersCount}
                onChange={(e) => setField('passengersCount', e.target.value)}
                className="num rtl:text-end"
              />
            </FormField>
          </div>
          <FormField label={<>{t.tripType} <span className="font-normal text-subtle">({t.optional})</span></>}>
            <Select dir={dir} value={form.categoryId || NONE} onValueChange={(v) => setField('categoryId', v === NONE ? '' : v)}>
              <SelectTrigger className="text-start">
                <SelectValue placeholder={t.chooseType} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.chooseType}</SelectItem>
                {options.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {nameOf(c, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {options.branches.length > 0 && (
            <FormField label={<>{t.preferredBranch} <span className="font-normal text-subtle">({t.optional})</span></>} className="sm:col-span-2">
              <Select dir={dir} value={form.branchId || NONE} onValueChange={(v) => setField('branchId', v === NONE ? '' : v)}>
                <SelectTrigger className="text-start">
                  <SelectValue placeholder={t.anyBranch} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t.anyBranch}</SelectItem>
                  {options.branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </div>
      </FormSection>

      <FormSection
        n={3}
        title={t.sectionServices}
        aside={
          <p
            data-field="services"
            aria-live="polite"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
              ruleOk ? 'bg-success/12 text-[color-mix(in_srgb,var(--success)_72%,var(--text))]' : errors.services ? 'bg-danger/10 text-danger' : 'bg-warning/12 text-[color-mix(in_srgb,var(--warning)_72%,var(--text))]',
            )}
          >
            {ruleOk ? <CheckCircle2 className="size-3.5" aria-hidden /> : <CircleDashed className="size-3.5" aria-hidden />}
            {ruleOk ? fmt(t.ruleOk, { count: selectedCount }) : fmt(t.rulePending, { n: minServices, count: selectedCount })}
          </p>
        }
      >
        <p className="-mt-2 mb-4 text-sm text-muted">{t.sectionServicesBody}</p>
        <div className="grid gap-3">
          {available.map((kind) => {
            const service = serviceByKind.get(kind)!;
            const s = services[kind];
            const Icon = SERVICE_ICON[kind];
            const title = kind === 'HOTEL' ? t.hotel : kind === 'TRANSPORT' ? t.transportService : t.restaurant;
            const hint = kind === 'HOTEL' ? t.hotelHint : kind === 'TRANSPORT' ? t.transportHint : t.restaurantHint;
            const companies = kind === 'TRANSPORT' ? service.companies.filter((c) => c.transportMode === s.mode) : service.companies;
            const modes = (options.transportModes?.length ? options.transportModes : (['LAND', 'SEA', 'AIR'] as TransportMode[]));
            return (
              <div
                key={kind}
                className={cn(
                  'rounded-card border p-4 transition-[border-color,background-color,box-shadow] duration-300 sm:p-5',
                  s.on ? 'border-primary/35 bg-surface-raised shadow-card' : 'border-dashed border-border-strong bg-transparent',
                )}
              >
                <div className="flex items-center gap-3.5">
                  <span className={cn('grid size-11 shrink-0 place-items-center rounded-full transition-colors', s.on ? 'bg-altitude shadow-primary' : 'bg-surface text-muted')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium" id={`svc-${kind}`}>
                      {title}
                    </p>
                    <p className="text-xs text-muted">{hint}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.on}
                    aria-labelledby={`svc-${kind}`}
                    onClick={() => setService(kind, { on: !s.on })}
                    className={cn(
                      'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors',
                      s.on ? 'bg-primary' : 'bg-border-strong',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 place-items-center rounded-full bg-white shadow transition-transform duration-200',
                        s.on ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0',
                      )}
                    >
                      {s.on ? <Check className="size-3.5 text-primary" /> : <Plus className="size-3.5 text-muted" />}
                    </span>
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {s.on && (
                    <motion.div
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-4 pt-5 sm:grid-cols-2">
                        {kind === 'TRANSPORT' && (
                          <div data-field="TRANSPORT.mode" className="sm:col-span-2">
                            <fieldset>
                              <legend className="text-[13px] font-medium">
                                {t.transportMode} <span className="text-danger" aria-hidden>*</span>
                              </legend>
                              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.transportMode}>
                                {modes.map((m) => {
                                  const MIcon = TRANSPORT_ICON[m];
                                  const active = s.mode === m;
                                  return (
                                    <button
                                      key={m}
                                      type="button"
                                      role="radio"
                                      aria-checked={active}
                                      onClick={() => setService(kind, { mode: m, companyId: '', otherText: '' })}
                                      className={cn(
                                        'flex h-12 items-center justify-center gap-2 rounded-field border text-sm font-medium transition-colors',
                                        active ? 'border-ink bg-ink text-ink-foreground' : 'border-border bg-surface-raised text-muted hover:border-border-strong hover:text-foreground',
                                      )}
                                    >
                                      <MIcon className="size-4" aria-hidden />
                                      {LABELS.transportMode[m][locale]}
                                    </button>
                                  );
                                })}
                              </div>
                              {errors['TRANSPORT.mode'] && (
                                <p role="alert" className="mt-2 text-xs font-medium text-danger">
                                  {errors['TRANSPORT.mode']}
                                </p>
                              )}
                            </fieldset>
                          </div>
                        )}
                        <div data-field={`${kind}.company`}>
                          <FormField label={t.company} required error={errors[`${kind}.company`]}>
                            <Select
                              dir={dir}
                              disabled={kind === 'TRANSPORT' && !s.mode}
                              value={s.companyId || undefined}
                              onValueChange={(v) => setService(kind, { companyId: v })}
                            >
                              <SelectTrigger className="text-start">
                                <SelectValue placeholder={kind === 'TRANSPORT' && !s.mode ? t.chooseModeFirst : t.chooseCompany} />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                    {c.city?.nameAr ? ` — ${c.city.nameAr}` : ''}
                                    {c.rating ? ` · ${'★'.repeat(c.rating)}` : ''}
                                  </SelectItem>
                                ))}
                                {companies.length > 0 && <SelectSeparator />}
                                <SelectItem value={OTHER}>{t.other}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormField>
                        </div>
                        {s.companyId === OTHER && (
                          <div data-field={`${kind}.other`}>
                            <FormField label={t.otherLabel} required error={errors[`${kind}.other`]}>
                              <Input
                                value={s.otherText}
                                onChange={(e) => setService(kind, { otherText: e.target.value })}
                                placeholder={t.otherPlaceholder}
                                maxLength={200}
                                autoFocus
                              />
                            </FormField>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </FormSection>

      <FormSection n={4} title={t.sectionMessage}>
        <FormField label={<>{t.message} <span className="font-normal text-subtle">({t.optional})</span></>}>
          <Textarea value={form.message} onChange={(e) => setField('message', e.target.value)} placeholder={t.messagePlaceholder} maxLength={1000} rows={4} />
        </FormField>
      </FormSection>

      {/* Honeypot (CTR-05): hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden className="absolute -start-[10000px] top-auto size-px overflow-hidden">
        <label>
          {t.honeypot}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setField('website', e.target.value)} />
        </label>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{t.privacyNote}</p>
        <Button type="submit" size="lg" loading={submitting} className="sm:min-w-52">
          {submitting ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}

function FormSection({ n, title, aside, children }: { n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0" aria-labelledby={`form-section-${n}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`form-section-${n}`} className="flex items-center gap-3">
          <span aria-hidden className="grid size-8 place-items-center rounded-full bg-ink text-xs font-medium text-ink-foreground num">
            {n}
          </span>
          <span className="heading-display text-[18px] sm:text-[20px]">{title}</span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
