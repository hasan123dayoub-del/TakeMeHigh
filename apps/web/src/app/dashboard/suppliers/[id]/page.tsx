import { SupplierDetailView } from '@/components/suppliers/supplier-detail-view';

export const instant = false;

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierDetailView id={id} />;
}
