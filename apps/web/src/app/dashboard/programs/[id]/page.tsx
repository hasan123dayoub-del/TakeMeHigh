import { ProgramDetail } from '@/components/programs/program-detail';

export const instant = false;

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProgramDetail id={id} />;
}
