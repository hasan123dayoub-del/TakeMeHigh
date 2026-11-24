'use client';

import { Languages, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';
import { WhatsAppIcon } from './icons';
import { landingMessages } from './messages';

interface Props {
  name: string;
  logoUrl: string | null;
  whatsappHref: string | null;
}

export function SiteHeader({ name, logoUrl, whatsappHref }: Props) {
  const t = useMessages(landingMessages);
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/#trips', label: t.navTrips },
    { href: '/#offers', label: t.navOffers },
    { href: '/#achievements', label: t.navAchievements },
    { href: '/#branches', label: t.navBranches },
    { href: '/#policies', label: t.navPolicies },
  ];
  const toggleLanguage = () => setLocale(locale === 'ar' ? 'en' : 'ar');

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-ink px-4 py-2 text-sm text-ink-foreground focus:not-sr-only focus:fixed focus:top-3 focus:start-3"
      >
        {t.skipToContent}
      </a>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
        <div
          className={cn(
            'mx-auto flex h-14 max-w-[1280px] items-center gap-2 rounded-full border px-2 transition-[background-color,box-shadow,border-color] duration-300 sm:h-16 sm:px-3',
            scrolled
              ? 'border-glass-border bg-glass shadow-glass backdrop-blur-xl backdrop-saturate-150'
              : 'border-white/60 bg-white/45 backdrop-blur-md dark:border-white/10 dark:bg-white/5',
          )}
        >
          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-full pe-2 ps-0.5" aria-label={`${name} — ${t.home}`}>
            <BrandMark name={name} logoUrl={logoUrl} />
            <span className="truncate font-display text-[15px] font-medium sm:text-base">{name}</span>
          </Link>

          <nav aria-label={t.mainNav} className="mx-auto hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-1.5 lg:ms-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              aria-label={t.switchLanguageLabel}
              lang={locale === 'ar' ? 'en' : 'ar'}
              className="hidden sm:inline-flex"
            >
              <Languages aria-hidden />
              {t.switchLanguage}
            </Button>
            <Button asChild variant="secondary" size="sm" className="hidden md:inline-flex">
              <Link href="/design-your-trip">{t.navDesign}</Link>
            </Button>
            {whatsappHref && (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-4" />
                  {t.whatsapp}
                </a>
              </Button>
            )}

            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <Button variant="secondary" size="icon" className="lg:hidden" aria-label={t.openMenu}>
                  <Menu aria-hidden />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-sky-950/30 backdrop-blur-[3px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
                <Dialog.Content
                  className="fixed inset-x-3 top-3 z-50 rounded-card border border-border bg-surface-raised p-5 shadow-pop outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
                  aria-describedby={undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <BrandMark name={name} logoUrl={logoUrl} />
                    <Dialog.Title className="min-w-0 flex-1 truncate font-display text-base font-medium">{name}</Dialog.Title>
                    <Dialog.Close asChild>
                      <Button variant="ghost" size="icon" aria-label={t.closeMenu}>
                        <X aria-hidden />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <nav aria-label={t.mainNav} className="mt-4">
                    <ul className="grid gap-1">
                      {[...links, { href: '/design-your-trip', label: t.navDesign }].map((l) => (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className="flex h-12 items-center rounded-tile px-4 text-[15px] font-medium transition-colors hover:bg-surface"
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
                    <Button variant="secondary" onClick={toggleLanguage} lang={locale === 'ar' ? 'en' : 'ar'}>
                      <Languages aria-hidden />
                      {t.switchLanguage}
                    </Button>
                    {whatsappHref && (
                      <Button asChild>
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <WhatsAppIcon className="size-4" />
                          {t.whatsapp}
                        </a>
                      </Button>
                    )}
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
    </>
  );
}
