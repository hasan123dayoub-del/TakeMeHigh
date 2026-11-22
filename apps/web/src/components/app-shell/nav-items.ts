import type { Permission } from '@travelos/shared';
import {
  BarChart3,
  CalendarCheck,
  Handshake,
  LayoutDashboard,
  Map,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden when the signed-in role lacks this permission. */
  permission?: Permission;
  /** One-line description (command palette, mobile menu). */
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Today at a glance',
  },
  {
    label: 'Trips',
    href: '/trips',
    icon: Map,
    permission: 'trips.read',
    description: 'Departures, capacity and itineraries',
  },
  {
    label: 'Bookings',
    href: '/bookings',
    icon: CalendarCheck,
    permission: 'bookings.read',
    description: 'Reservations, passengers and payments',
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: Users,
    permission: 'customers.read',
    description: 'Travellers and booking history',
  },
  {
    label: 'Suppliers',
    href: '/suppliers',
    icon: Handshake,
    permission: 'suppliers.read',
    description: 'Hotels, transport and guides',
  },
  {
    label: 'Finance',
    href: '/finance',
    icon: Wallet,
    permission: 'finance.read',
    description: 'Payments, expenses and balances',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permission: 'reports.read',
    description: 'Revenue, occupancy and performance',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings.manage',
    description: 'Agency profile, team and preferences',
  },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
