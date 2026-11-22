import { PaymentReceiptView } from '@/components/payments/receipt';

export const instant = false;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentReceiptView id={id} />;
}
