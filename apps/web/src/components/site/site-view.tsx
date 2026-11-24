'use client';

import { ExternalLink, FileText, GalleryHorizontal, Lock, Settings2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useUrlState } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { AchievementsTab } from './achievements-tab';
import { PoliciesTab } from './policies-tab';
import { SettingsTab } from './settings-tab';
import { SlidesTab } from './slides-tab';

const m = defineMessages({
  ar: {
    eyebrow: 'الإدارة',
    title: 'الصفحة العامة',
    description: 'محتوى صفحة المكتب العامة: الهوية والتواصل وزر واتساب، السلايدر، الإنجازات، والصفحات والسياسات.',
    settings: 'الإعدادات',
    slides: 'السلايدر',
    achievements: 'الإنجازات',
    policies: 'الصفحات والسياسات',
    open: 'فتح الصفحة العامة',
  },
  en: {
    eyebrow: 'Administration',
    title: 'Public site',
    description: 'Content of the office’s public page: identity, contact and WhatsApp button, slides, achievements, pages and policies.',
    settings: 'Settings',
    slides: 'Slides',
    achievements: 'Achievements',
    policies: 'Pages & policies',
    open: 'Open public site',
  },
});

const TABS = ['settings', 'slides', 'achievements', 'policies'] as const;
type Tab = (typeof TABS)[number];

export function SiteView() {
  const t = useMessages(m);
  const c = useMessages(common);
  const { can } = useAuth();
  const [state, set] = useUrlState({ tab: 'settings' } as Record<string, string | undefined>);
  if (!can('site.manage')) return <EmptyState icon={Lock} title={c.forbiddenTitle} description={c.forbiddenBody} />;
  const tab: Tab = (TABS as readonly string[]).includes(state.tab ?? '') ? (state.tab as Tab) : 'settings';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <Button asChild variant="secondary">
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink /> {t.open}
            </a>
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'settings' ? undefined : v })}>
        <TabsList>
          <TabsTrigger value="settings">
            <Settings2 className="size-4" aria-hidden /> {t.settings}
          </TabsTrigger>
          <TabsTrigger value="slides">
            <GalleryHorizontal className="size-4" aria-hidden /> {t.slides}
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="size-4" aria-hidden /> {t.achievements}
          </TabsTrigger>
          <TabsTrigger value="policies">
            <FileText className="size-4" aria-hidden /> {t.policies}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="slides">
          <SlidesTab />
        </TabsContent>
        <TabsContent value="achievements">
          <AchievementsTab />
        </TabsContent>
        <TabsContent value="policies">
          <PoliciesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
