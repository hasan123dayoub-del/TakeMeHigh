'use client';

import { Activity } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useLocale, useMessages } from '@/lib/i18n';
import type { DashboardData } from '@/lib/types/dashboard';
import { useFormat } from '@/lib/use-format';
import { ACTIVITY_LABELS, dashboardMessages } from './messages';

/** Office audit trail (admins only: the API returns an empty list for branch roles). */
export function ActivityFeed({ items }: { items: DashboardData['recentActivity'] }) {
  const t = useMessages(dashboardMessages);
  const f = useFormat();
  const { locale } = useLocale();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>{t.activityTitle}</CardTitle>
          <CardDescription>{t.activityHint}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {!items.length ? (
          <EmptyState size="sm" icon={Activity} title={t.noActivity} />
        ) : (
          <ol className="relative space-y-4">
            <span aria-hidden className="absolute top-4 bottom-4 start-4 w-px bg-border" />
            {items.map((a) => {
              const label = ACTIVITY_LABELS[a.action]?.[locale];
              const actor = a.user?.fullName ?? t.system;
              return (
                <li key={a.id} className="relative flex gap-3">
                  <Avatar name={actor} size="sm" className="relative z-10 ring-4 ring-surface" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug">
                      <span className="font-medium">{actor}</span> <span className="text-muted">{label ?? a.summary}</span>
                    </p>
                    {label && (
                      <p className="mt-0.5 truncate text-xs text-subtle" dir="auto" title={a.summary}>
                        {a.summary}
                      </p>
                    )}
                    <time dateTime={a.createdAt} className="mt-0.5 block text-[11px] text-subtle">
                      {f.relative(a.createdAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
