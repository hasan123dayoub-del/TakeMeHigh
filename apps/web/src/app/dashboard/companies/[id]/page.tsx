import { CompanyDetail } from '@/components/suppliers/company-detail';

export const instant = false;

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyDetail id={id} />;
}
