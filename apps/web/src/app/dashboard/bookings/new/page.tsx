import { Suspense } from 'react';
import { DetailSkeleton } from '@/components/bookings/kit';
import { NewBookingFlow } from '@/components/bookings/new-booking/new-booking-flow';

export const instant = false;

export default function NewBookingPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <NewBookingFlow />
    </Suspense>
  );
}
