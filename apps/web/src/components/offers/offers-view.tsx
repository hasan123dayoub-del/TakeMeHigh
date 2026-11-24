'use client';

import { OFFER_KINDS } from '@travelos/shared';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useCan } from '@/lib/auth';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import type { Offer } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { offerMessages } from './messages';
import { dayOf, offerCurrency, useDiscountLabel } from './offer-utils';

export function OffersView() {
  const t = useMessages(offerMessages);
  const { locale } = useLocale();
  const canManage = useCan('offers.manage');
  const f = useFormat();
  const discount = useDiscountLabel();
  const router = useRouter();

  const columns = useMemo<ResourceColumn<Offer>[]>(
    () => [
      {
        id: 'title',
        header: t.offerTitle,
        sortKey: 'title',
        cell: (o) => (
          <div className="flex min-w-[220px] items-center gap-3">
            {o.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.coverImageUrl} alt="" className="h-10 w-14 shrink-0 rounded-[10px] object-cover" />
            ) : (
              <span className="h-10 w-14 shrink-0 rounded-[10px] bg-altitude opacity-70" aria-hidden />
            )}
            <Link href={`/dashboard/offers/${o.id}`} className="font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
              {o.title}
            </Link>
          </div>
        ),
        print: (o) => o.title,
      },
      {
        id: 'kind',
        header: t.kind,
        cell: (o) => <StatusBadge kind="offerKind" status={o.kind} />,
        print: (o) => LABELS.offerKind[o.kind][locale],
      },
      {
        id: 'discount',
        header: t.discount,
        align: 'end',
        cell: (o) => <span className="num font-medium whitespace-nowrap">{discount(o.discountMode, o.discountValue, offerCurrency(o))}</span>,
      },
      {
        id: 'validity',
        header: t.validity,
        sortKey: 'validFrom',
        cell: (o) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="num text-[13px]">
              {f.date(dayOf(o.validFrom), 'short')} <span className="text-subtle">—</span> {f.date(dayOf(o.validTo), 'short')}
            </span>
            {o.live && (
              <Badge tone="success" size="sm" dot>
                {t.live}
              </Badge>
            )}
          </div>
        ),
        print: (o) => `${dayOf(o.validFrom)} — ${dayOf(o.validTo)}${o.live ? ` (${t.live})` : ''}`,
      },
      {
        id: 'price',
        header: t.price,
        align: 'end',
        cell: (o) =>
          o.kind === 'BUNDLE' && o.currencyCode ? <span className="num font-medium whitespace-nowrap">{f.money(o.pricePerPerson, o.currencyCode)}</span> : <span className="text-subtle">—</span>,
        print: (o) => (o.kind === 'BUNDLE' && o.currencyCode ? f.money(o.pricePerPerson, o.currencyCode) : '—'),
      },
      {
        id: 'seats',
        header: t.seats,
        align: 'center',
        cell: (o) =>
          o.kind === 'BUNDLE' ? (
            <span className="num whitespace-nowrap">
              <span className="font-medium">{o.confirmedSeats}</span> <span className="text-subtle">/</span> <span className="text-muted">{o.maxSeats ?? '∞'}</span>
            </span>
          ) : (
            <span className="text-subtle">—</span>
          ),
        print: (o) => (o.kind === 'BUNDLE' ? `${o.confirmedSeats} / ${o.maxSeats ?? '∞'}` : '—'),
      },
      {
        id: 'targets',
        header: t.targets,
        align: 'center',
        cell: (o) => (o.kind === 'DISCOUNT' ? <span className="num">{fmt(t.targetsCount, { n: o.targets.length })}</span> : <span className="text-subtle">—</span>),
        print: (o) => (o.kind === 'DISCOUNT' ? String(o.targets.length) : '—'),
      },
      {
        id: 'status',
        header: t.status,
        cell: (o) => (
          <Badge tone={o.isActive ? 'success' : 'neutral'} dot>
            {o.isActive ? t.active : t.inactive}
          </Badge>
        ),
        print: (o) => (o.isActive ? t.active : t.inactive),
      },
    ],
    [t, locale, f, discount],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          canManage && (
            <Button asChild>
              <Link href="/dashboard/offers/new">
                <Plus /> {t.add}
              </Link>
            </Button>
          )
        }
      />
      <ResourceTable<Offer>
        endpoint="/offers"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['kind', 'live', 'isActive']}
        defaultSort={{ key: 'createdAt', order: 'desc' }}
        minWidth={1000}
        filters={(flt, set) => (
          <>
            <FilterSelect label={t.kind} value={flt.kind} onChange={(v) => set({ kind: v })} options={OFFER_KINDS.map((k) => ({ value: k, label: LABELS.offerKind[k][locale] }))} />
            <FilterSelect label={t.validity} value={flt.live} onChange={(v) => set({ live: v })} options={[{ value: 'true', label: t.liveNow }]} />
            <FilterSelect
              label={t.status}
              value={flt.isActive}
              onChange={(v) => set({ isActive: v })}
              options={[
                { value: 'true', label: t.active },
                { value: 'false', label: t.inactive },
              ]}
            />
          </>
        )}
        onRowClick={(o) => router.push(`/dashboard/offers/${o.id}`)}
        getRowId={(o) => o.id}
        empty={{
          title: t.empty,
          description: t.emptyBody,
          action: canManage ? (
            <Button asChild>
              <Link href="/dashboard/offers/new">
                <Plus /> {t.add}
              </Link>
            </Button>
          ) : undefined,
        }}
      />
    </div>
  );
}
