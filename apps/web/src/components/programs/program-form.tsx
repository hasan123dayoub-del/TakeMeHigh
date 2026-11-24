'use client';

/*
 * Create / edit a program (PGM-01..05): basics, the legs picker with live continuity hints, and a
 * sticky summary with Σ leg prices (BR-06), the currency check and the API's error list.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CalendarRange, Check, Coins, Save, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { QueryState } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApiMutation, useInvalidate, useList, useLookups, useName, useResource } from '@/lib/hooks';
import { fmt, useMessages } from '@/lib/i18n';
import type { Program, TripListItem } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { LegsChain, TripPicker } from './legs-picker';
import { programMessages } from './messages';
import { ApiErrors, Callout, CoverUpload, fromCents, fromLocalInput, ServiceChips, toLocalInput } from './product-bits';
import { chainSummary, daysBetween, legFromProgram, legFromTrip, type LegTrip } from './program-utils';

const SHARED = '__shared__';

export function ProgramNew() {
  return <ProgramForm program={null} />;
}

export function ProgramEdit({ id }: { id: string }) {
  const q = useResource<Program>(`/programs/${id}`);
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data && <ProgramForm program={q.data} />}
    </QueryState>
  );
}

function ProgramForm({ program }: { program: Program | null }) {
  const t = useMessages(programMessages);
  const { isAdmin, user } = useAuth();
  const lookups = useLookups();
  const name = useName();
  const f = useFormat();
  const router = useRouter();
  const invalidate = useInvalidate();

  const [legs, setLegs] = useState<LegTrip[]>(() => program?.legs.map((l) => legFromProgram(l.trip)) ?? []);
  const [saveError, setSaveError] = useState<unknown>(null);

  const open = useList<TripListItem>('/trips', { status: 'OPEN', pageSize: 100, sort: 'startsAt', order: 'asc' });
  const drafts = useList<TripListItem>('/trips', { status: 'DRAFT', pageSize: 100, sort: 'startsAt', order: 'asc' });
  const candidates = useMemo(() => [...(open.data?.data ?? []), ...(drafts.data?.data ?? [])].map(legFromTrip), [open.data, drafts.data]);

  const tripsLocked = !!program && (!['DRAFT', 'OPEN'].includes(program.status) || (program._count.bookings > 0 && !isAdmin));

  const schema = useMemo(
    () =>
      z
        .object({
          title: z.string().trim().min(3, { error: t.minLength }),
          description: z.string().optional(),
          categoryId: z.string().min(1, { error: t.required }),
          branch: z.string(),
          registrationDeadline: z.string().min(1, { error: t.required }),
          minPassengers: z.string().regex(/^\d{1,4}$/, { error: t.required }),
          maxPassengers: z.string().regex(/^\d{1,4}$/, { error: t.required }),
          isPublic: z.boolean(),
          coverImageUrl: z.string(),
          terms: z.string().optional(),
        })
        .refine((v) => Number(v.maxPassengers) >= Number(v.minPassengers), { path: ['maxPassengers'], error: t.maxBelowMin }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: program?.title ?? '',
      description: program?.description ?? '',
      categoryId: program?.categoryId ?? '',
      branch: program ? (program.branchId ?? SHARED) : SHARED,
      registrationDeadline: toLocalInput(program?.registrationDeadline),
      minPassengers: String(program?.minPassengers ?? 10),
      maxPassengers: String(program?.maxPassengers ?? 40),
      isPublic: program?.isPublic ?? false,
      coverImageUrl: program?.coverImageUrl ?? '',
      terms: program?.terms ?? '',
    },
  });
  const errors = form.formState.errors;
  const branch = useWatch({ control: form.control, name: 'branch' });

  // which trips the program may use (scope rule enforced by the API too)
  const allowedBranch: string | null | undefined = isAdmin ? (branch === SHARED ? null : branch) : (user?.branch?.id ?? undefined);

  const s = chainSummary(legs);
  const currency = s.currencies[0] ?? null;
  const services = [...new Set(legs.flatMap((l) => l.services ?? []))];
  const tripIdsChanged = !program || legs.map((l) => l.id).join() !== program.legs.map((l) => l.tripId).join();

  const save = useApiMutation(
    async (v: Values) => {
      setSaveError(null);
      const body: Record<string, unknown> = {
        title: v.title.trim(),
        description: v.description?.trim() || undefined,
        categoryId: v.categoryId,
        registrationDeadline: fromLocalInput(v.registrationDeadline),
        minPassengers: Number(v.minPassengers),
        maxPassengers: Number(v.maxPassengers),
        isPublic: v.isPublic,
        coverImageUrl: v.coverImageUrl || undefined,
        terms: v.terms?.trim() || undefined,
      };
      if (isAdmin && v.branch !== SHARED && (!program || v.branch !== program.branchId)) body.branchId = v.branch;
      if (tripIdsChanged) body.tripIds = legs.map((l) => l.id);
      return program ? api.patch<{ id: string }>(`/programs/${program.id}`, body) : api.post<{ id: string }>('/programs', body);
    },
    {
      silent: true,
      success: program ? t.saved : t.created,
      onSuccess: async (r) => {
        await invalidate('/programs', '/trips');
        router.push(`/dashboard/programs/${r.id}`);
      },
    },
  );

  const submit = form.handleSubmit((v) =>
    save.mutate(v, {
      onError: (e) => {
        setSaveError(e);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }),
  );

  const canSubmit = legs.length >= 2 && !s.mixedCurrency;
  const days = daysBetween(s.startsAt, s.endsAt);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href={program ? `/dashboard/programs/${program.id}` : '/dashboard/programs'} className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="rtl-flip size-3.5" aria-hidden /> {program ? program.code : t.back}
          </Link>
        }
        title={program ? t.editTitle : t.newTitle}
        description={t.formDescription}
      />

      {saveError ? <ApiErrors error={saveError} /> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ---------------- legs */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.chain}</CardTitle>
                <CardDescription>{t.chainHint}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="min-w-0">
                {tripsLocked && (
                  <div className="mb-4">
                    <Callout tone="warning" title={program && !['DRAFT', 'OPEN'].includes(program.status) ? t.tripsLockedStatus : t.tripsLockedHint} />
                  </div>
                )}
                <LegsChain legs={legs} onChange={setLegs} locked={tripsLocked} />
              </div>
              {!tripsLocked && (
                <div className="min-w-0 rounded-[18px] bg-surface-sunken/60 p-4 ring-1 ring-border/60 ring-inset">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium">{t.pickTitle}</h3>
                    <p className="mt-0.5 text-xs text-muted">{t.pickHint}</p>
                  </div>
                  <TripPicker
                    trips={candidates}
                    loading={open.isLoading || drafts.isLoading}
                    selected={legs}
                    currency={currency}
                    last={legs.at(-1) ?? null}
                    allowedBranch={allowedBranch}
                    onAdd={(leg) => setLegs((x) => [...x, leg])}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---------------- basics */}
          <Card>
            <CardHeader>
              <CardTitle>{t.basics}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.name} error={errors.title?.message} required className="sm:col-span-2">
                <Input {...form.register('title')} />
              </FormField>
              <FormField label={t.category} error={errors.categoryId?.message} required>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {(lookups.data?.categories ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {name(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label={t.branch} hint={isAdmin ? t.branchHint : t.branchFixed}>
                {isAdmin ? (
                  <Controller
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SHARED} disabled={!!program?.branchId}>
                            {t.shared}
                          </SelectItem>
                          {(lookups.data?.branches ?? []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <Input value={program?.branch?.name ?? user?.branch?.name ?? '—'} disabled readOnly />
                )}
              </FormField>
              <FormField
                label={t.deadline}
                error={errors.registrationDeadline?.message}
                required
                hint={s.earliestDeadline ? fmt(t.deadlineHint, { max: f.date(s.earliestDeadline, 'dateTime') }) : t.deadlineHintEmpty}
              >
                <Input type="datetime-local" dir="ltr" {...form.register('registrationDeadline')} max={toLocalInput(s.earliestDeadline)} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t.minPassengers} error={errors.minPassengers?.message} required>
                  <Input dir="ltr" inputMode="numeric" {...form.register('minPassengers')} />
                </FormField>
                <FormField label={t.maxPassengers} error={errors.maxPassengers?.message} required>
                  <Input dir="ltr" inputMode="numeric" {...form.register('maxPassengers')} />
                </FormField>
              </div>
              <FormField label={t.descriptionField} className="sm:col-span-2">
                <Textarea rows={3} {...form.register('description')} />
              </FormField>
              <FormField label={t.cover} className="sm:col-span-2">
                <Controller control={form.control} name="coverImageUrl" render={({ field }) => <CoverUpload value={field.value} onChange={field.onChange} />} />
              </FormField>
              <FormField label={t.terms} className="sm:col-span-2">
                <Textarea rows={3} {...form.register('terms')} />
              </FormField>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register('isPublic')} />
                {t.isPublic}
              </label>
            </CardContent>
          </Card>
        </div>

        {/* ---------------- summary */}
        <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
          <Card tone="altitude" className="p-5 text-white">
            <div className="text-xs font-medium tracking-[0.16em] uppercase opacity-85">{t.total}</div>
            <div className="num mt-3 text-[34px] leading-none font-medium tracking-tight">
              {currency && !s.mixedCurrency ? f.money(fromCents(s.priceCents), currency) : '—'}
            </div>
            <p className="mt-2 text-xs opacity-85">{t.totalHint}</p>
            {s.costCents !== null && currency && !s.mixedCurrency && (
              <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3 text-xs">
                <span className="opacity-85">{t.totalCost}</span>
                <span className="num font-medium">{f.money(fromCents(s.costCents), currency)}</span>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="eyebrow text-[12px]">{t.summary}</h3>
            <dl className="mt-4 flex flex-col gap-3.5 text-[14px]">
              <SummaryRow icon={Coins} label={t.currency}>
                {legs.length ? (
                  <span className={cn('inline-flex items-center gap-1.5 font-medium', s.mixedCurrency ? 'text-danger' : 'text-[color-mix(in_srgb,var(--success)_75%,var(--text))]')}>
                    {s.mixedCurrency ? <X className="size-3.5" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
                    <span className="num ltr-nums">{s.currencies.join(' · ')}</span>
                  </span>
                ) : (
                  '—'
                )}
              </SummaryRow>
              <SummaryRow icon={CalendarRange} label={t.span}>
                {s.startsAt ? (
                  <span className="num">
                    {f.date(s.startsAt, 'short')} — {f.date(s.endsAt, 'short')}
                    {days ? <span className="text-muted"> · {fmt(t.daysN, { n: days })}</span> : null}
                  </span>
                ) : (
                  '—'
                )}
              </SummaryRow>
              <SummaryRow icon={Users} label={t.seatsCap}>
                <span className="num">{s.seatsCap ?? '—'}</span>
              </SummaryRow>
            </dl>
            {services.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-2 text-xs text-muted">{t.services}</div>
                <ServiceChips kinds={services} size="sm" />
              </div>
            )}
            <div className="mt-4 border-t border-border pt-4">
              {legs.length < 2 ? (
                <Callout tone="info" title={t.needTwo} />
              ) : s.mixedCurrency ? (
                <Callout tone="danger" title={t.currencyMixed} />
              ) : s.connected ? (
                <Callout tone="success" title={t.checksOk} />
              ) : (
                <Callout tone="danger" title={t.checksBad} />
              )}
            </div>
            <Button type="submit" className="mt-4 w-full" disabled={!canSubmit} loading={save.isPending}>
              {!save.isPending && <Save />} {program ? t.save : t.create}
            </Button>
            {s.mixedCurrency && <p className="mt-2 text-xs text-danger">{t.currencyMixed}</p>}
          </Card>
        </aside>
      </div>
    </form>
  );
}

function SummaryRow({ icon: Icon, label, children }: { icon: typeof Coins; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="inline-flex items-center gap-2 text-muted">
        <Icon className="size-4 text-subtle" aria-hidden />
        {label}
      </dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}
