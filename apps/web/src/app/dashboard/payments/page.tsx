import { Suspense } from 'react';
import { ListSkeleton } from '@/components/bookings/kit';
import { PaymentsView } from '@/components/payments/payments-view';

export const instant = false;

export default function PaymentsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <PaymentsView />
    </Suspense>
  );
}
