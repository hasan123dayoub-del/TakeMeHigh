'use client';

import { ROLE_LABELS } from '@travelos/shared';
import { Building2, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { ModulePage } from '@/components/app-shell/module-placeholder';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function SettingsView() {
  const { user, agency, role } = useAuth();
  return (
    <ModulePage module="settings">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-muted" aria-hidden /> Agency profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="Name">{agency?.name ?? '—'}</Row>
              <Row label="Workspace">
                <span className="num">{agency?.slug ?? '—'}</span>
              </Row>
              <Row label="Default currency">
                <Badge tone="primary" size="sm">
                  {agency?.currency ?? '—'}
                </Badge>
              </Row>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-muted" aria-hidden /> Your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Row label="Name">
                <span className="inline-flex items-center gap-2">
                  <Avatar name={user?.fullName} size="sm" />
                  {user?.fullName}
                </span>
              </Row>
              <Row label="Email">{user?.email}</Row>
              <Row label="Role">
                {role && (
                  <Badge tone="ink" size="sm">
                    {ROLE_LABELS[role]}
                  </Badge>
                )}
              </Row>
            </dl>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
