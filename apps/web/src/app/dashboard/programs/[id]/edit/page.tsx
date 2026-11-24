import { ProgramEdit } from '@/components/programs/program-form';

export const instant = false;

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProgramEdit id={id} />;
}
