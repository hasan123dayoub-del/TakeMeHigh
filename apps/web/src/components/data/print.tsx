'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, useOfficeSettings } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/lib/i18n';

/**
 * Printable document rendered in a portal and printed with the browser (RPT-02: "Save as PDF"
 * keeps Arabic shaping and RTL perfect, which server-side PDF libraries do not). Everything
 * else on the page is hidden by the `@media print` rules in globals.css (#print-root).
 */
export function PrintPortal({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  // PrintPortal only mounts after a user action, so document exists here
  const [host] = useState<HTMLElement>(() => {
    const el = document.createElement('div');
    el.id = 'print-root';
    return el;
  });
  useEffect(() => {
    const el = host;
    document.body.appendChild(el);
    document.body.classList.add('printing');
    const after = () => onDone();
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('afterprint', after);
      document.body.classList.remove('printing');
      el.remove();
    };
  }, [onDone, host]);

  useEffect(() => {
    // let images and fonts settle before opening the print dialog
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [host]);

  return createPortal(children, host);
}

/** Office header used on every printed list, report and receipt (RPT-02). */
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useAuth();
  const settings = useOfficeSettings().data;
  const { intl, locale } = useLocale();
  return (
    <header className="print-header">
      <div>
        <div className="print-office">{(locale === 'en' && settings?.officeNameEn) || settings?.officeName || 'Take Me High'}</div>
        <h1 className="print-title">{title}</h1>
        {subtitle && <p className="print-subtitle">{subtitle}</p>}
      </div>
      <div className="print-meta">
        <div>{formatDate(new Date(), 'dateTime', intl)}</div>
        <div>{user?.fullName}</div>
        {settings?.phone && <div className="ltr-nums">{settings.phone}</div>}
      </div>
    </header>
  );
}
