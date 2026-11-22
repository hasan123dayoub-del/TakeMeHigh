import { Suspense } from 'react';
import { ListSkeleton } from '@/components/bookings/kit';
import { ReportsView } from '@/components/reports/reports-view';

export const instant = false;

export default function ReportsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <ReportsView />
    </Suspense>
  );
}
