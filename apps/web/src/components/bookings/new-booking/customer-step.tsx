'use client';

import { Check, UserPlus, UserRoundSearch } from 'lucide-react';
import { useState } from 'react';
import { CustomerForm } from '@/components/customers/customer-form';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { fmt, useMessages } from '@/lib/i18n';
import { useCustomers } from '@/lib/queries/customers';
import type { Customer, CustomerListItem } from '@/lib/types/customers';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { Ltr, QueryError, SearchField } from '../kit';
import { bm } from '../messages';
import { useDebounced } from '../use-debounced';

export function CustomerStep({ selected, onSelect }: { selected: Customer | null; onSelect: (c: Customer) => void }) {
  const t = useMessages(bm);
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebounced(search.trim());
  const q = useCustomers({ page: 1, pageSize: 6, search: debounced || undefined }, !creating);

  if (creating) {
    return (
      <div className="grid gap-4 rounded-card border border-border bg-surface-raised p-4 shadow-card sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserPlus className="size-4 text-primary" aria-hidden /> {t.newCustomer}
        </div>
        <CustomerForm
          withNotes={false}
          onSaved={(c) => {
            setCreating(false);
            onSelect(c);
          }}
          onPickExisting={(c) => {
            setCreating(false);
            onSelect(c);
          }}
          footer={(submit) => (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                {t.back}
              </Button>
              {submit}
            </div>
          )}
        />
      </div>
    );
  }

  const rows = q.data?.data ?? [];
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchField value={search} onChange={setSearch} placeholder={t.customerSearch} className="sm:flex-1" autoFocus />
        {can('customers.create') && (
          <Button variant="secondary" size="lg" className="h-11" onClick={() => setCreating(true)}>
            <UserPlus /> {t.newCustomer}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">{t.customerNote}</p>
      {q.isError ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} size="sm" />
      ) : q.isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-tile" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          size="sm"
          icon={UserRoundSearch}
          title={t.customerNoMatch}
          description={t.customerNoMatchBody}
          action={
            can('customers.create') && (
              <Button onClick={() => setCreating(true)}>
                <UserPlus /> {t.newCustomer}
              </Button>
            )
          }
        />
      ) : (
        <ul role="listbox" aria-label={t.stepCustomer} className={cn('grid gap-2', q.isPlaceholderData && 'opacity-60')}>
          {rows.map((c) => (
            <CustomerOption key={c.id} c={c} selected={c.id === selected?.id} onSelect={() => onSelect(c)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerOption({ c, selected, onSelect }: { c: CustomerListItem; selected: boolean; onSelect: () => void }) {
  const t = useMessages(bm);
  const f = useFormat();
  const owes = c.outstanding.filter((o) => Number(o.amount) > 0);
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 rounded-tile border bg-surface-raised p-3 text-start shadow-card transition-colors',
          'hover:border-border-strong focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none',
          selected ? 'border-primary ring-4 ring-primary/15' : 'border-border',
        )}
      >
        <Avatar name={c.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{c.fullName}</div>
          <div className="flex flex-wrap gap-x-3 text-xs text-muted">
            <Ltr className="num">{c.phone}</Ltr>
            {c.nationalId && <Ltr className="num">{c.nationalId}</Ltr>}
            <span>{fmt(t.bookingsN, { n: f.number(c.bookings) })}</span>
          </div>
        </div>
        {owes.length > 0 && (
          <div className="hidden text-end text-xs sm:block">
            <div className="text-muted">{t.owes}</div>
            {owes.map((o) => (
              <div key={o.currencyCode} className="num font-medium text-danger">
                {f.money(o.amount, o.currencyCode)}
              </div>
            ))}
          </div>
        )}
        {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
      </button>
    </li>
  );
}
