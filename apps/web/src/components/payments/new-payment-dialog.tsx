'use client';

import { Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useList, useResource } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { BookingDetail, BookingListItem } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { PaymentDialog } from '../bookings/booking-dialogs';

const m = defineMessages({
  ar: {
    title: 'تسجيل دفعة جديدة',
    description: 'اختر الحجز الذي تريد الدفع عليه. تظهر فقط الحجوزات التي عليها مبلغ متبقٍ.',
    search: 'ابحث برقم الحجز أو اسم العميل أو هاتفه…',
    none: 'لا توجد حجوزات عليها مبلغ متبقٍ.',
    remaining: 'متبقٍ',
  },
  en: {
    title: 'Record a new payment',
    description: 'Pick the booking to pay for. Only bookings with a remaining balance are listed.',
    search: 'Search by booking no., customer name or phone…',
    none: 'No bookings with a remaining balance.',
    remaining: 'Remaining',
  },
});

/** Payments page shortcut: pick a booking with a balance, then record the payment on it. */
export function NewPaymentDialog({ onClose }: { onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  const list = useList<BookingListItem>('/bookings', { pageSize: 100, sort: 'createdAt', order: 'desc', ...(search ? { search } : {}) });
  const rows = (list.data?.data ?? []).filter((b) => b.status !== 'CANCELLED' && Number(b.balance) > 0);
  const picked = useResource<BookingDetail>(pickedId ? `/bookings/${pickedId}` : null);

  if (picked.data) return <PaymentDialog booking={picked.data} onClose={onClose} />;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input className="ps-9" placeholder={t.search} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
          {list.isLoading || pickedId ? (
            <div className="flex justify-center p-6">
              <Loader2 className="size-5 animate-spin text-muted" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">{t.none}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => setPickedId(b.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-surface-raised">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">
                        <span className="num">{b.bookingNo}</span> · {b.payer.fullName}
                      </span>
                      <span className="line-clamp-1 text-xs text-muted">{b.targetTitle}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="text-xs text-muted">{t.remaining}</span>
                      <span className="num font-medium text-primary">{f.money(b.balance, b.currencyCode)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
