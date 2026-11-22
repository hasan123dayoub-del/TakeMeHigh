import { Suspense } from 'react';
import { BookingsList } from '@/components/bookings/bookings-list';
import { ListSkeleton } from '@/components/bookings/kit';

export const instant = false;

export default function BookingsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={8} />}>
      <BookingsList />
    </Suspense>
  );
}
