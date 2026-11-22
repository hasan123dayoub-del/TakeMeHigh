import type { Permission } from '@travelos/shared';
import {
  BarChart3,
  CalendarCheck,
  Handshake,
  Map,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type ModuleKey =
  'trips' | 'bookings' | 'customers' | 'suppliers' | 'finance' | 'reports' | 'settings';

export interface ModuleCopy {
  title: string;
  description: string;
  icon: LucideIcon;
  permission: Permission;
  emptyTitle: string;
  emptyDescription: string;
  capabilities: string[];
}

/** Product copy for module landing views (shown until each module's data screens ship). */
export const MODULE_COPY: Record<ModuleKey, ModuleCopy> = {
  trips: {
    title: 'Trips',
    description:
      'Plan departures, manage seat capacity and pricing, and publish itineraries your team can sell.',
    icon: Map,
    permission: 'trips.read',
    emptyTitle: 'No trips scheduled yet',
    emptyDescription:
      'Create your first trip to open it for bookings. Every departure appears here with its dates, seats sold and status.',
    capabilities: [
      'Departure and return dates, destination and meeting point',
      'Seat capacity with live availability',
      'Per-person pricing in your agency currency',
      'Draft, publish, and close trips when they are full',
    ],
  },
  bookings: {
    title: 'Bookings',
    description:
      'Reserve seats for customers, follow each booking from pending to completed, and collect payments.',
    icon: CalendarCheck,
    permission: 'bookings.read',
    emptyTitle: 'No bookings yet',
    emptyDescription:
      'Bookings taken in the office, by phone, on WhatsApp or through your public page are listed here with their status and balance.',
    capabilities: [
      'Reserve seats on any published trip',
      'Pending, confirmed, cancelled and completed states',
      'Deposits, partial payments and outstanding balance',
      'Booking source: office, phone, WhatsApp or public page',
    ],
  },
  customers: {
    title: 'Customers',
    description:
      "Keep every traveller's contact details and complete booking history in one profile.",
    icon: Users,
    permission: 'customers.read',
    emptyTitle: 'No customers yet',
    emptyDescription:
      'Customers are added when you create a booking, or you can add them directly to build your client list.',
    capabilities: [
      'Contact details and travel documents',
      'Full booking and payment history',
      'Notes for preferences and special requests',
      'Search by name, phone number or email',
    ],
  },
  suppliers: {
    title: 'Suppliers',
    description:
      'Manage the hotels, transport companies and guides behind every trip, and what each one is owed.',
    icon: Handshake,
    permission: 'suppliers.read',
    emptyTitle: 'No suppliers added',
    emptyDescription:
      'Add your hotels, transport partners and guides to link them to trips and record their costs.',
    capabilities: [
      'Hotels, transport, guides and other partners',
      'Contact people and agreed rates',
      'Costs linked to specific trips',
      'Amounts payable tracked per supplier',
    ],
  },
  finance: {
    title: 'Finance',
    description:
      'Record customer payments and agency expenses, and see what has been collected, spent and is still outstanding.',
    icon: Wallet,
    permission: 'finance.read',
    emptyTitle: 'No transactions recorded',
    emptyDescription:
      'Customer payments and agency expenses will appear here as one ledger in your agency currency.',
    capabilities: [
      'Payments by cash, bank transfer, card or mobile wallet',
      'Expenses grouped by category',
      'Outstanding balance on every booking',
      'Refunds recorded with a full audit trail',
    ],
  },
  reports: {
    title: 'Reports',
    description:
      'Understand revenue, occupancy and team performance across trips and time periods.',
    icon: BarChart3,
    permission: 'reports.read',
    emptyTitle: 'Reports build themselves from your data',
    emptyDescription:
      'As bookings and payments are recorded, TravelOS calculates revenue, occupancy and profitability for every period.',
    capabilities: [
      'Revenue and profit by month and by trip',
      'Seat occupancy for each departure',
      'Bookings by source and by agent',
      'Expenses compared with revenue',
    ],
  },
  settings: {
    title: 'Settings',
    description: 'Manage your agency profile, team members, roles and preferences.',
    icon: Settings,
    permission: 'settings.manage',
    emptyTitle: 'Team and preferences',
    emptyDescription:
      'Invite colleagues, assign roles and keep your agency details up to date. Changes apply to everyone in your agency.',
    capabilities: [
      'Agency name, logo and default currency',
      'Invite team members and deactivate accounts',
      'Roles: owner, administrator, operations, agent, accountant',
      'Permissions applied across every module',
    ],
  },
};
