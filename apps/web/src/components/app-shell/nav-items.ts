'use client';

import type { Permission } from '@travelos/shared';
import {
  BarChart3,
  CalendarCheck,
  Handshake,
  LayoutDashboard,
  Map,
  Route,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One-line description (command palette, mobile menu). */
  description: string;
}

interface NavDef {
  href: string;
  icon: LucideIcon;
  /** Shown if the role has ANY of these permissions (none = every office member). */
  anyOf?: Permission[];
  label: { ar: string; en: string };
  description: { ar: string; en: string };
}

const NAV: NavDef[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: { ar: 'الرئيسية', en: 'Dashboard' }, description: { ar: 'نظرة على يوم المكتب', en: 'Today at a glance' } },
  { href: '/dashboard/trips', icon: Map, anyOf: ['trips.view'], label: { ar: 'الرحلات', en: 'Trips' }, description: { ar: 'المواعيد والمقاعد والأسعار والقرارات', en: 'Dates, seats, prices and decisions' } },
  { href: '/dashboard/bookings', icon: CalendarCheck, anyOf: ['bookings.view'], label: { ar: 'الحجوزات', en: 'Bookings' }, description: { ar: 'الحجوزات والركاب والدفعات', en: 'Bookings, passengers and payments' } },
  { href: '/dashboard/customers', icon: Users, anyOf: ['customers.view'], label: { ar: 'الزبائن', en: 'Customers' }, description: { ar: 'سجل الزبائن وكشوف الحساب', en: 'Customer records and statements' } },
  { href: '/dashboard/tours', icon: Route, anyOf: ['tours.view'], label: { ar: 'البرامج', en: 'Tours' }, description: { ar: 'البرامج السياحية والتصنيفات', en: 'Tour programs and categories' } },
  { href: '/dashboard/suppliers', icon: Handshake, anyOf: ['suppliers.view'], label: { ar: 'الموردون', en: 'Suppliers' }, description: { ar: 'الفنادق والنقل والمطاعم والمستحقات', en: 'Hotels, transport, restaurants and dues' } },
  { href: '/dashboard/payments', icon: Wallet, anyOf: ['payments.view'], label: { ar: 'الدفعات', en: 'Payments' }, description: { ar: 'الإيصالات والمرتجعات', en: 'Receipts and refunds' } },
  { href: '/dashboard/reports', icon: BarChart3, anyOf: ['reports.view'], label: { ar: 'التقارير', en: 'Reports' }, description: { ar: 'التقارير والتصدير إلى PDF وExcel', en: 'Reports with PDF and Excel export' } },
  {
    href: '/dashboard/settings',
    icon: Settings,
    anyOf: ['office.manage', 'branches.manage', 'employees.manage', 'roles.manage', 'offers.manage'],
    label: { ar: 'الإعدادات', en: 'Settings' },
    description: { ar: 'المكتب والفروع والموظفون والأدوار والإعلانات', en: 'Office, branches, staff, roles and ads' },
  },
];

/** Navigation for the signed-in role, in the current language. */
export function useNavItems(): NavItem[] {
  const { user } = useAuth();
  const { locale } = useLocale();
  return useMemo(() => {
    const granted = new Set(user?.permissions ?? []);
    return NAV.filter((n) => !n.anyOf || n.anyOf.some((p) => granted.has(p))).map((n) => ({
      href: n.href,
      icon: n.icon,
      label: n.label[locale],
      description: n.description[locale],
    }));
  }, [user, locale]);
}

export function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}
