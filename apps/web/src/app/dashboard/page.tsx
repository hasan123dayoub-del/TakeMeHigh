'use client';

import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth';
import { greeting } from '@/lib/format';
import { useLocale } from '@/lib/i18n';

/** Placeholder overview; replaced by the real dashboard (KPIs, trips, tasks). */
export default function DashboardPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  return <PageHeader title={`${greeting(new Date(), locale)}${user ? `، ${user.fullName.split(' ')[0]}` : ''}`} />;
}
