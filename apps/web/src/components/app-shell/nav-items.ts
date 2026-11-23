'use client';

import type { Permission } from '@travelos/shared';
import {
  Building2,
  CalendarCheck,
  ClipboardList,
  FileClock,
  Globe2,
  Handshake,
  Layers,
  LayoutDashboard,
  Map,
  MessageSquarePlus,
  Network,
  PanelsTopLeft,
  Percent,
  PieChart,
  Plug,
  ShieldCheck,
  Stamp,
  Tags,
  UserCog,
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

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

interface NavDef {
  href: string;
  icon: LucideIcon;
  /** Shown if the role has ANY of these permissions (none = everyone). */
  anyOf?: Permission[];
  label: { ar: string; en: string };
  description: { ar: string; en: string };
}

const GROUPS: { label: { ar: string; en: string } | null; items: NavDef[] }[] = [
  {
    label: null,
    items: [{ href: '/dashboard', icon: LayoutDashboard, label: { ar: 'الرئيسية', en: 'Home' }, description: { ar: 'ملخّص اليوم والتنبيهات', en: 'Today and alerts' } }],
  },
  {
    label: { ar: 'العمليات', en: 'Operations' },
    items: [
      { href: '/dashboard/trips', icon: Map, anyOf: ['trips.view'], label: { ar: 'الرحلات', en: 'Trips' }, description: { ar: 'بناء الرحلات وخدماتها والتسجيل', en: 'Build trips, services and registration' } },
      { href: '/dashboard/programs', icon: Layers, anyOf: ['programs.view'], label: { ar: 'البرامج', en: 'Programs' }, description: { ar: 'رحلات متسلسلة تُحجز كحزمة', en: 'Chained trips booked as one' } },
      { href: '/dashboard/offers', icon: Percent, anyOf: ['offers.view'], label: { ar: 'العروض', en: 'Offers' }, description: { ar: 'حزم الخدمات والخصومات', en: 'Bundles and discounts' } },
      { href: '/dashboard/bookings', icon: CalendarCheck, anyOf: ['bookings.view'], label: { ar: 'الحجوزات', en: 'Bookings' }, description: { ar: 'الركاب والمقاعد والانتظار', en: 'Passengers, seats and waitlist' } },
      { href: '/dashboard/customers', icon: Users, anyOf: ['customers.view'], label: { ar: 'العملاء', en: 'Customers' }, description: { ar: 'العملاء ووثائق السفر', en: 'Customers and travel documents' } },
      { href: '/dashboard/payments', icon: Wallet, anyOf: ['payments.view'], label: { ar: 'الدفعات', en: 'Payments' }, description: { ar: 'الوصولات والاسترجاعات', en: 'Receipts and refunds' } },
      { href: '/dashboard/visas', icon: Stamp, anyOf: ['visas.manage'], label: { ar: 'التأشيرات', en: 'Visas' }, description: { ar: 'تأشيرات الرحلات الخارجية', en: 'Visas for trips abroad' } },
      { href: '/dashboard/requests', icon: MessageSquarePlus, anyOf: ['requests.view'], label: { ar: 'طلبات الرحلات', en: 'Trip requests' }, description: { ar: 'طلبات «صمّم رحلتك» من الصفحة العامة', en: '“Design your trip” requests' } },
    ],
  },
  {
    label: { ar: 'الموردون', en: 'Suppliers' },
    items: [
      { href: '/dashboard/companies', icon: Handshake, anyOf: ['companies.view'], label: { ar: 'الشركات', en: 'Companies' }, description: { ar: 'الفنادق والنقل والمطاعم وبنودها', en: 'Hotels, transport, restaurants and items' } },
      { href: '/dashboard/services', icon: Tags, anyOf: ['services.manage', 'pricing.set_profit'], label: { ar: 'الخدمات والأرباح', en: 'Services & profit' }, description: { ar: 'أنواع الخدمات وقواعد الربح', en: 'Service types and profit rules' } },
      { href: '/dashboard/integrations', icon: Plug, anyOf: ['integrations.manage'], label: { ar: 'التكامل', en: 'Integrations' }, description: { ar: 'الربط مع منصات الموردين', en: 'Supplier platform connections' } },
    ],
  },
  {
    label: { ar: 'التقارير', en: 'Reports' },
    items: [
      { href: '/dashboard/reports', icon: ClipboardList, anyOf: ['reports.operational'], label: { ar: 'التقارير', en: 'Reports' }, description: { ar: 'الأرصدة والدفعات اليومية', en: 'Balances and daily cash' } },
      { href: '/dashboard/statistics', icon: PieChart, anyOf: ['stats.view'], label: { ar: 'الإحصائيات', en: 'Statistics' }, description: { ar: 'الإجمالي والحجوزات والأرباح شهرياً وسنوياً', en: 'Totals, bookings and profit by month and year' } },
    ],
  },
  {
    label: { ar: 'الإدارة', en: 'Administration' },
    items: [
      { href: '/dashboard/branches', icon: Building2, anyOf: ['branches.view'], label: { ar: 'الفروع', en: 'Branches' }, description: { ar: 'فروع المكتب', en: 'Office branches' } },
      { href: '/dashboard/employees', icon: UserCog, anyOf: ['users.view'], label: { ar: 'الموظفون', en: 'Staff' }, description: { ar: 'الموظفون ومديرو الفروع والأدلة', en: 'Employees, managers and guides' } },
      { href: '/dashboard/roles', icon: ShieldCheck, anyOf: ['roles.manage'], label: { ar: 'الأدوار والصلاحيات', en: 'Roles & permissions' }, description: { ar: 'مصفوفة الصلاحيات', en: 'Permission matrix' } },
      { href: '/dashboard/geo', icon: Globe2, anyOf: ['geo.view'], label: { ar: 'الدول والمحافظات', en: 'Countries & cities' }, description: { ar: 'تفعيل وتعطيل الدول والمدن', en: 'Enable and disable places' } },
      { href: '/dashboard/categories', icon: Network, anyOf: ['categories.manage'], label: { ar: 'تصنيفات الرحلات', en: 'Trip categories' }, description: { ar: 'ثقافي، ديني…', en: 'Cultural, religious…' } },
      { href: '/dashboard/site', icon: PanelsTopLeft, anyOf: ['site.manage'], label: { ar: 'الصفحة العامة', en: 'Public site' }, description: { ar: 'السلايدر والإنجازات والسياسات والإعدادات', en: 'Slides, achievements, policies, settings' } },
      { href: '/dashboard/audit', icon: FileClock, anyOf: ['audit.view'], label: { ar: 'سجل التدقيق', en: 'Audit log' }, description: { ar: 'من فعل ماذا ومتى', en: 'Who did what and when' } },
    ],
  },
];

/** Sidebar groups for the signed-in role, in the current language (UI only; the API enforces). */
export function useNavGroups(): NavGroup[] {
  const { user } = useAuth();
  const { locale } = useLocale();
  return useMemo(() => {
    const granted = new Set(user?.permissions ?? []);
    return GROUPS.map((g) => ({
      label: g.label ? g.label[locale] : null,
      items: g.items
        .filter((n) => !n.anyOf || n.anyOf.some((p) => granted.has(p)))
        .map((n) => ({ href: n.href, icon: n.icon, label: n.label[locale], description: n.description[locale] })),
    })).filter((g) => g.items.length);
  }, [user, locale]);
}

/** Flat list (command palette). */
export function useNavItems(): NavItem[] {
  const groups = useNavGroups();
  return useMemo(() => groups.flatMap((g) => g.items), [groups]);
}

export function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

