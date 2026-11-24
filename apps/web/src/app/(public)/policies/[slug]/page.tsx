import type { Metadata } from 'next';
import { policyMetadata } from '@/components/landing/metadata';
import { PolicyArticle } from '@/components/landing/policy-article';

export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return policyMetadata((await params).slug);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PolicyArticle slug={slug} />;
}
