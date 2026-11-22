import { BookingPrint } from '@/components/bookings/print/booking-print';

export const instant = false;

export default async function BookingPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookingPrint id={id} />;
}
