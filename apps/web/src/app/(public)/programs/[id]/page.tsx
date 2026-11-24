import type { Metadata } from 'next';
import { programMetadata } from '@/components/landing/metadata';
import { ProgramDetail } from '@/components/landing/program-detail';

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return programMetadata((await params).id);
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ProgramDetail id={id} />;
}
