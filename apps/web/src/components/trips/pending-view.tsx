'use client';

import { Construction } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { defineMessages, useMessages } from '@/lib/i18n';

const m = defineMessages({
  ar: { title: 'هذه الشاشة قيد الإنجاز', body: 'البيانات متاحة في الواجهة البرمجية؛ الشاشة الكاملة لم تُنجز بعد.' },
  en: { title: 'This screen is in progress', body: 'The data is available in the API; the full screen is not finished yet.' },
});

/** Honest placeholder for screens not finished yet. */
export function PendingView() {
  const t = useMessages(m);
  return (
    <Card>
      <EmptyState icon={Construction} title={t.title} description={t.body} />
    </Card>
  );
}
