'use client';

/*
 * Countries, governorates and cities (REF-01..04, BR-11). Places are never deleted: they are
 * disabled, and disabled ones disappear from every new choice while old records keep them.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Plus, Power } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { CITY_KINDS, LABELS, type CityKind } from '@travelos/shared';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useApiMutation, useInvalidate, useList, useName } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { City, Country } from '@/lib/types/api';
import { useToastAction } from './admin-helpers';

const m = defineMessages({
  ar: {
    eyebrow: 'البيانات المرجعية',
    title: 'الدول والمحافظات',
    description: 'الدول والمحافظات والمدن والمواقع السياحية المستخدمة في الرحلات والعملاء والموردين. لا يُحذف أي مكان أبداً؛ يُعطَّل فقط، والمعطّل يختفي من الخيارات الجديدة ويبقى في السجلات القديمة.',
    countries: 'الدول',
    cities: 'المحافظات والمدن',
    addCountry: 'دولة جديدة',
    addCity: 'مكان جديد',
    iso: 'الرمز',
    isoHint: 'رمز ISO من حرفين، مثال SY',
    isoRule: 'الرمز حرفان إنكليزيان',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنكليزية',
    name: 'الاسم',
    country: 'الدولة',
    kind: 'النوع',
    citiesCount: 'المدن',
    status: 'الحالة',
    active: 'فعّال',
    inactive: 'معطّل',
    disabledCountry: 'الدولة معطّلة',
    enable: 'تفعيل',
    disable: 'تعطيل',
    disableCountryTitle: 'تعطيل {name}؟',
    disableCountryBody: 'تختفي الدولة ومدنها من الخيارات الجديدة (الرحلات، الجنسيات، الموردون). تبقى السجلات القديمة كما هي، ويمكن إعادة تفعيلها.',
    disableCityTitle: 'تعطيل {name}؟',
    disableCityBody: 'يختفي المكان من الخيارات الجديدة وتبقى السجلات القديمة كما هي. يمكن إعادة تفعيله.',
    enableTitle: 'تفعيل {name}؟',
    enableBody: 'سيظهر مجدداً في الخيارات الجديدة.',
    enabled: 'تم التفعيل',
    disabled: 'تم التعطيل',
    newCountry: 'دولة جديدة',
    editCountry: 'تعديل الدولة',
    newCity: 'مكان جديد',
    editCity: 'تعديل المكان',
    formHint: 'الأماكن لا تُحذف؛ يمكن تعطيلها مع الاحتفاظ بسجلها.',
    saved: 'تم الحفظ',
    required: 'هذا الحقل مطلوب',
    nameShort: 'الاسم حرفان على الأقل',
    searchCountries: 'ابحث بالاسم أو الرمز…',
    searchCities: 'ابحث بالاسم…',
    emptyCountries: 'لا توجد دول',
    emptyCities: 'لا توجد أماكن',
  },
  en: {
    eyebrow: 'Reference data',
    title: 'Countries & cities',
    description: 'Countries, governorates, cities and tourist spots used by trips, customers and suppliers. Places are never deleted, only disabled; disabled places disappear from new choices and stay on old records.',
    countries: 'Countries',
    cities: 'Governorates & cities',
    addCountry: 'New country',
    addCity: 'New place',
    iso: 'Code',
    isoHint: 'Two-letter ISO code, e.g. SY',
    isoRule: 'The code is two Latin letters',
    nameAr: 'Arabic name',
    nameEn: 'English name',
    name: 'Name',
    country: 'Country',
    kind: 'Kind',
    citiesCount: 'Cities',
    status: 'Status',
    active: 'Active',
    inactive: 'Disabled',
    disabledCountry: 'Country disabled',
    enable: 'Enable',
    disable: 'Disable',
    disableCountryTitle: 'Disable {name}?',
    disableCountryBody: 'The country and its cities disappear from new choices (trips, nationalities, suppliers). Old records stay unchanged and you can enable it again.',
    disableCityTitle: 'Disable {name}?',
    disableCityBody: 'The place disappears from new choices; old records stay unchanged. You can enable it again.',
    enableTitle: 'Enable {name}?',
    enableBody: 'It appears again in new choices.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    newCountry: 'New country',
    editCountry: 'Edit country',
    newCity: 'New place',
    editCity: 'Edit place',
    formHint: 'Places are never deleted; disable them to keep their history.',
    saved: 'Saved',
    required: 'This field is required',
    nameShort: 'The name needs at least 2 characters',
    searchCountries: 'Search by name or code…',
    searchCities: 'Search by name…',
    emptyCountries: 'No countries',
    emptyCities: 'No places',
  },
});

type Tab = 'countries' | 'cities';

/** Every country (active or not), for the city filter and form. Max page size is 100. */
function useAllCountries() {
  return useList<Country>('/countries', { pageSize: 100, sort: 'nameAr', order: 'asc' });
}

export function GeoView() {
  const t = useMessages(m);
  const canManage = useCan('geo.manage');
  const router = useRouter();
  const pathname = usePathname();
  const { dir } = useLocale();
  const [tab, setTab] = useState<Tab>('countries');
  const [editingCountry, setEditingCountry] = useState<Country | 'new' | null>(null);
  const [editingCity, setEditingCity] = useState<City | 'new' | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          canManage &&
          (tab === 'countries' ? (
            <Button onClick={() => setEditingCountry('new')}>
              <Plus /> {t.addCountry}
            </Button>
          ) : (
            <Button onClick={() => setEditingCity('new')}>
              <Plus /> {t.addCity}
            </Button>
          ))
        }
      />
      <Tabs
        dir={dir}
        value={tab}
        onValueChange={(v) => {
          setTab(v as Tab);
          // each tab has its own filters; start clean (the list filters live in the URL)
          router.replace(pathname, { scroll: false });
        }}
      >
        <TabsList>
          <TabsTrigger value="countries">{t.countries}</TabsTrigger>
          <TabsTrigger value="cities">{t.cities}</TabsTrigger>
        </TabsList>
        <TabsContent value="countries">
          <CountriesTable canManage={canManage} onEdit={setEditingCountry} />
        </TabsContent>
        <TabsContent value="cities">
          <CitiesTable canManage={canManage} onEdit={setEditingCity} />
        </TabsContent>
      </Tabs>

      {editingCountry && <CountryDialog country={editingCountry === 'new' ? null : editingCountry} onClose={() => setEditingCountry(null)} />}
      {editingCity && <CityDialog city={editingCity === 'new' ? null : editingCity} onClose={() => setEditingCity(null)} />}
    </div>
  );
}

function StatusCell({ active }: { active: boolean }) {
  const t = useMessages(m);
  return (
    <Badge tone={active ? 'success' : 'neutral'} dot>
      {active ? t.active : t.inactive}
    </Badge>
  );
}

function CountriesTable({ canManage, onEdit }: { canManage: boolean; onEdit: (c: Country) => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const name = useName();
  const invalidate = useInvalidate();
  const run = useToastAction();
  const [toggling, setToggling] = useState<Country | null>(null);

  const columns = useMemo<ResourceColumn<Country>[]>(
    () => [
      { id: 'iso', header: t.iso, sortKey: 'isoCode', cell: (x) => <span className="font-mono text-[14px]">{x.isoCode}</span> },
      { id: 'nameAr', header: t.nameAr, sortKey: 'nameAr', cell: (x) => <span className="font-medium">{x.nameAr}</span> },
      { id: 'nameEn', header: t.nameEn, sortKey: 'nameEn', cell: (x) => <span dir="ltr">{x.nameEn}</span> },
      { id: 'cities', header: t.citiesCount, align: 'end', cell: (x) => <span className="num">{x._count?.cities ?? 0}</span> },
      { id: 'status', header: t.status, cell: (x) => <StatusCell active={x.isActive} />, print: (x) => (x.isActive ? t.active : t.inactive) },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: c.actions,
              screenOnly: true,
              align: 'end' as const,
              cell: (x: Country) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon-sm" variant="ghost" title={c.edit} aria-label={`${c.edit} ${name(x)}`} onClick={() => onEdit(x)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" title={x.isActive ? t.disable : t.enable} aria-label={`${x.isActive ? t.disable : t.enable} ${name(x)}`} onClick={() => setToggling(x)}>
                    <Power className={x.isActive ? 'text-danger' : 'text-success'} />
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, c, canManage, name, onEdit],
  );

  return (
    <>
      <ResourceTable<Country>
        endpoint="/countries"
        columns={columns}
        exportTitle={t.countries}
        searchPlaceholder={t.searchCountries}
        filterKeys={['isActive']}
        defaultSort={{ key: 'nameAr', order: 'asc' }}
        filters={(f, set) => (
          <FilterSelect
            label={t.status}
            value={f.isActive}
            onChange={(v) => set({ isActive: v })}
            options={[
              { value: 'true', label: t.active },
              { value: 'false', label: t.inactive },
            ]}
          />
        )}
        onRowClick={canManage ? onEdit : undefined}
        getRowId={(x) => x.id}
        empty={{ title: t.emptyCountries }}
      />
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling ? (toggling.isActive ? t.disableCountryTitle : t.enableTitle).replace('{name}', name(toggling)) : ''}
        description={toggling?.isActive ? t.disableCountryBody : t.enableBody}
        destructive={toggling?.isActive}
        confirmLabel={toggling?.isActive ? t.disable : t.enable}
        onConfirm={async () => {
          if (!toggling) return;
          await run(() => api.patch(`/countries/${toggling.id}/active`, { isActive: !toggling.isActive }), toggling.isActive ? t.disabled : t.enabled);
          await invalidate('/countries', '/cities', '/lookups');
        }}
      />
    </>
  );
}

function CitiesTable({ canManage, onEdit }: { canManage: boolean; onEdit: (c: City) => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const name = useName();
  const invalidate = useInvalidate();
  const run = useToastAction();
  const countries = useAllCountries();
  const [toggling, setToggling] = useState<City | null>(null);

  const columns = useMemo<ResourceColumn<City>[]>(
    () => [
      { id: 'nameAr', header: t.nameAr, sortKey: 'nameAr', cell: (x) => <span className="font-medium">{x.nameAr}</span> },
      { id: 'nameEn', header: t.nameEn, sortKey: 'nameEn', cell: (x) => <span dir="ltr">{x.nameEn}</span> },
      {
        id: 'kind',
        header: t.kind,
        sortKey: 'kind',
        cell: (x) => <Badge tone={x.kind === 'GOVERNORATE' ? 'primary' : x.kind === 'TOURIST_SPOT' ? 'info' : 'neutral'}>{LABELS.cityKind[x.kind][locale]}</Badge>,
        print: (x) => LABELS.cityKind[x.kind][locale],
      },
      {
        id: 'country',
        header: t.country,
        cell: (x) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[12px] text-subtle">{x.country?.isoCode}</span>
            {name(x.country)}
            {x.country?.isActive === false && (
              <Badge size="sm" tone="neutral">
                {t.disabledCountry}
              </Badge>
            )}
          </span>
        ),
        print: (x) => name(x.country),
      },
      { id: 'status', header: t.status, cell: (x) => <StatusCell active={x.isActive} />, print: (x) => (x.isActive ? t.active : t.inactive) },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: c.actions,
              screenOnly: true,
              align: 'end' as const,
              cell: (x: City) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon-sm" variant="ghost" title={c.edit} aria-label={`${c.edit} ${name(x)}`} onClick={() => onEdit(x)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" title={x.isActive ? t.disable : t.enable} aria-label={`${x.isActive ? t.disable : t.enable} ${name(x)}`} onClick={() => setToggling(x)}>
                    <Power className={x.isActive ? 'text-danger' : 'text-success'} />
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, c, locale, canManage, name, onEdit],
  );

  return (
    <>
      <ResourceTable<City>
        endpoint="/cities"
        columns={columns}
        exportTitle={t.cities}
        searchPlaceholder={t.searchCities}
        filterKeys={['countryId', 'kind', 'isActive']}
        defaultSort={{ key: 'nameAr', order: 'asc' }}
        filters={(f, set) => (
          <>
            <FilterSelect
              label={t.country}
              value={f.countryId}
              onChange={(v) => set({ countryId: v })}
              options={(countries.data?.data ?? []).map((x) => ({ value: x.id, label: name(x) }))}
            />
            <FilterSelect
              label={t.kind}
              value={f.kind}
              onChange={(v) => set({ kind: v })}
              options={CITY_KINDS.map((k) => ({ value: k, label: LABELS.cityKind[k][locale] }))}
            />
            <FilterSelect
              label={t.status}
              value={f.isActive}
              onChange={(v) => set({ isActive: v })}
              options={[
                { value: 'true', label: t.active },
                { value: 'false', label: t.inactive },
              ]}
            />
          </>
        )}
        onRowClick={canManage ? onEdit : undefined}
        getRowId={(x) => x.id}
        empty={{ title: t.emptyCities }}
      />
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling ? (toggling.isActive ? t.disableCityTitle : t.enableTitle).replace('{name}', name(toggling)) : ''}
        description={toggling?.isActive ? t.disableCityBody : t.enableBody}
        destructive={toggling?.isActive}
        confirmLabel={toggling?.isActive ? t.disable : t.enable}
        onConfirm={async () => {
          if (!toggling) return;
          await run(() => api.patch(`/cities/${toggling.id}/active`, { isActive: !toggling.isActive }), toggling.isActive ? t.disabled : t.enabled);
          await invalidate('/cities', '/countries', '/lookups');
        }}
      />
    </>
  );
}

function CountryDialog({ country, onClose }: { country: Country | null; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();
  const schema = useMemo(
    () =>
      z.object({
        isoCode: z.string().trim().regex(/^[A-Za-z]{2}$/, { error: t.isoRule }),
        nameAr: z.string().trim().min(2, { error: t.nameShort }),
        nameEn: z.string().trim().min(2, { error: t.nameShort }),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { isoCode: country?.isoCode ?? '', nameAr: country?.nameAr ?? '', nameEn: country?.nameEn ?? '' },
  });
  const save = useApiMutation(
    (v: Values) => {
      const body = { ...v, isoCode: v.isoCode.toUpperCase() };
      return country ? api.patch(`/countries/${country.id}`, body) : api.post('/countries', body);
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/countries', '/cities', '/lookups');
        onClose();
      },
    },
  );
  const errors = form.formState.errors;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{country ? t.editCountry : t.newCountry}</DialogTitle>
          <DialogDescription>{t.formHint}</DialogDescription>
        </DialogHeader>
        <form id="country-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4" noValidate>
          <FormField label={t.iso} hint={t.isoHint} error={errors.isoCode?.message} required>
            <Input dir="ltr" maxLength={2} className="w-28 font-mono uppercase" autoFocus {...form.register('isoCode')} />
          </FormField>
          <FormField label={t.nameAr} error={errors.nameAr?.message} required>
            <Input {...form.register('nameAr')} />
          </FormField>
          <FormField label={t.nameEn} error={errors.nameEn?.message} required>
            <Input dir="ltr" {...form.register('nameEn')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="country-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CityDialog({ city, onClose }: { city: City | null; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const name = useName();
  const invalidate = useInvalidate();
  const countries = useAllCountries();
  const schema = useMemo(
    () =>
      z.object({
        countryId: z.string().min(1, { error: t.required }),
        nameAr: z.string().trim().min(2, { error: t.nameShort }),
        nameEn: z.string().trim().min(2, { error: t.nameShort }),
        kind: z.enum(CITY_KINDS),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { countryId: city?.countryId ?? '', nameAr: city?.nameAr ?? '', nameEn: city?.nameEn ?? '', kind: city?.kind ?? 'CITY' },
  });
  const save = useApiMutation((v: Values) => (city ? api.patch(`/cities/${city.id}`, v) : api.post('/cities', v)), {
    success: t.saved,
    onSuccess: async () => {
      await invalidate('/cities', '/countries', '/lookups');
      onClose();
    },
  });
  const errors = form.formState.errors;
  // new places go in active countries only; an existing place keeps its (maybe disabled) country
  const options = (countries.data?.data ?? []).filter((x) => x.isActive || x.id === city?.countryId);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{city ? t.editCity : t.newCity}</DialogTitle>
          <DialogDescription>{t.formHint}</DialogDescription>
        </DialogHeader>
        <form id="city-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField label={t.country} error={errors.countryId?.message} required>
            <Controller
              control={form.control}
              name="countryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {name(x)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.kind} required>
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v as CityKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CITY_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {LABELS.cityKind[k][locale]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.nameAr} error={errors.nameAr?.message} required>
            <Input {...form.register('nameAr')} autoFocus />
          </FormField>
          <FormField label={t.nameEn} error={errors.nameEn?.message} required>
            <Input dir="ltr" {...form.register('nameEn')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="city-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
