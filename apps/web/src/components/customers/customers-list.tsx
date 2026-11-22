'use client';

import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { Pager, Forbidden, ListSkeleton, Ltr, Money, QueryError, SearchField } from '@/components/bookings/kit';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth';
import { useMessages } from '@/lib/i18n';
import { useCustomers } from '@/lib/queries/customers';
import { useFormat } from '@/lib/use-format';
import { CustomerForm } from './customer-form';
import { cm } from './messages';

/** /dashboard/customers — office-wide customers with balances per currency (real API data). */
export function CustomersList() {
  const t = useMessages(cm);
  const f = useFormat();
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const term = useDeferredValue(search.trim());
  const allowed = can('customers.view');
  const q = useCustomers({ page, pageSize: 20, search: term || undefined }, allowed);

  if (!allowed) return <Forbidden />;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          can('customers.create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> {t.newCustomer}
            </Button>
          )
        }
      />

      <GlassPanel className="grid gap-4 p-4 sm:p-6">
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={t.searchPh}
          className="max-w-md"
        />

        {q.isPending ? (
          <ListSkeleton rows={8} />
        ) : q.isError ? (
          <QueryError error={q.error} onRetry={() => void q.refetch()} />
        ) : q.data.data.length === 0 ? (
          <EmptyState icon={Users} title={term ? t.noResults : t.emptyTitle} description={term ? t.noResultsBody : t.emptyBody} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-xs text-muted">
                    <th className="px-3 py-2.5 text-start font-medium">{t.colName}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{t.colPhone}</th>
                    <th className="hidden px-3 py-2.5 text-start font-medium md:table-cell">{t.colIds}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{t.colBookings}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{t.colOutstanding}</th>
                    <th className="hidden px-3 py-2.5 text-start font-medium lg:table-cell">{t.colAdded}</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data.data.map((c) => {
                    const due = c.outstanding.filter((o) => Number(o.amount) > 0);
                    return (
                      <tr key={c.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface/60">
                        <td className="px-3 py-3">
                          <Link href={`/dashboard/customers/${c.id}`} className="font-medium hover:text-primary">
                            {c.fullName}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <Ltr className="text-muted">{c.phone}</Ltr>
                        </td>
                        <td className="hidden px-3 py-3 text-muted md:table-cell">
                          <Ltr>{c.nationalId ?? c.passportNumber ?? '—'}</Ltr>
                        </td>
                        <td className="num px-3 py-3">{f.number(c.bookings)}</td>
                        <td className="px-3 py-3">
                          {due.length ? (
                            <div className="grid gap-0.5">
                              {due.map((o) => (
                                <Money key={o.currencyCode} value={o.amount} currency={o.currencyCode} className="text-danger" />
                              ))}
                            </div>
                          ) : (
                            <span className="text-subtle">{t.none}</span>
                          )}
                        </td>
                        <td className="hidden px-3 py-3 text-muted lg:table-cell">{f.date(c.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager {...q.data.meta} onPageChange={setPage} loading={q.isFetching} />
          </>
        )}
      </GlassPanel>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t.newCustomer}</DialogTitle>
            <DialogDescription>{t.phoneHint}</DialogDescription>
          </DialogHeader>
          <CustomerForm onSaved={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
