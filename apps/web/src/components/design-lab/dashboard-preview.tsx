"use client";

import {
  ArrowUpRight,
  Bell,
  CalendarClock,
  Download,
  Handshake,
  LayoutDashboard,
  LineChart,
  Map,
  Plane,
  Plus,
  Search,
  Settings,
  Ticket,
  TrendingDown,
  UserPlus,
  Users,
  Wallet,
  Armchair,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CSSProperties } from "react";
import { BOOKINGS, BOOKINGS_BY_MONTH, KPIS, SERIES, type BookingStatus, type PaymentStatus } from "./sample-data";
import { gradientCss, type ModeTokens } from "./tokens";
import { luminance } from "./contrast";

export const NAV = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Trips", icon: Map },
  { label: "Bookings", icon: Ticket },
  { label: "Customers", icon: Users },
  { label: "Suppliers", icon: Handshake },
  { label: "Finance", icon: Wallet },
  { label: "Reports", icon: LineChart },
  { label: "Settings", icon: Settings },
];

const KPI_ICONS = {
  revenue: CircleDollarSign,
  bookings: Ticket,
  seats: Armchair,
  outstanding: ReceiptText,
} as const;

export const tint = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
export const mix = (a: string, b: string, p: number) => `color-mix(in srgb, ${a} ${p}%, ${b})`;

export function statusColor(t: ModeTokens, s: BookingStatus | PaymentStatus) {
  switch (s) {
    case "Confirmed":
      return t.success;
    case "Pending":
      return t.warning;
    case "Cancelled":
      return t.error;
    case "Paid":
      return t.info;
    case "Partial":
      return t.accent;
    default:
      return t.textMuted;
  }
}

export function Badge({ t, label, pill }: { t: ModeTokens; label: BookingStatus | PaymentStatus; pill?: boolean }) {
  const c = statusColor(t, label);
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-semibold leading-none"
      style={{
        background: tint(c, 14),
        color: mix(c, t.text, 72),
        borderRadius: pill ? 999 : 5,
        boxShadow: `inset 0 0 0 1px ${tint(c, 22)}`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {label}
    </span>
  );
}

type Props = {
  t: ModeTokens;
  radius: number;
  fontFamily: string;
  uppercaseHeadings?: boolean;
  minHeight?: number;
};

export function DashboardPreview({ t, radius, fontFamily, uppercaseHeadings, minHeight = 560 }: Props) {
  const glass = t.glass;
  const r = radius;
  const rs = Math.max(4, Math.round(radius * 0.6));
  const pill = !!glass;
  const heroGrad = t.gradients[0];
  const sidebarBg = glass && luminance(t.sidebar.bg) > 0.6 ? tint(t.sidebar.bg, 55) : t.sidebar.bg;
  const sheen = t.gradients[1] ?? t.gradients[0];
  const card: CSSProperties = glass
    ? { background: t.surface, borderRadius: r, border: `1px solid ${tint(t.border, 70)}` }
    : {
        background: t.surface,
        borderRadius: r,
        border: `1px solid ${t.border}`,
        boxShadow: `0 1px 2px ${tint(t.text, 5)}`,
      };
  const headingStyle: CSSProperties = uppercaseHeadings
    ? { textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 300 }
    : { fontWeight: 600, letterSpacing: "-0.01em" };

  const shell = (
    <div
      className="@container flex w-full overflow-hidden"
      style={{
        minHeight,
        background: glass ? glass.panel : t.background,
        color: t.text,
        fontFamily,
        borderRadius: glass ? 26 : 14,
        border: glass ? `1px solid ${glass.panelBorder}` : undefined,
        boxShadow: glass ? glass.shadow : undefined,
        backdropFilter: glass ? "blur(18px) saturate(140%)" : undefined,
        WebkitBackdropFilter: glass ? "blur(18px) saturate(140%)" : undefined,
      }}
    >
      {/* Sidebar (full) */}
      <aside
        className="hidden w-[178px] shrink-0 flex-col @[640px]:flex"
        style={{
          background: sidebarBg,
          color: t.sidebar.text,
          borderRight: `1px solid ${glass ? tint(t.sidebar.border, 60) : t.sidebar.border}`,
        }}
      >
        <div className="flex items-center gap-2 px-4 pb-4 pt-4">
          <span
            className="grid size-7 place-items-center"
            style={{ background: gradientCss(sheen), color: sheen.ink, borderRadius: pill ? 999 : rs }}
          >
            <Plane className="size-3.5" strokeWidth={2.4} />
          </span>
          <span className="text-[13px] font-semibold tracking-tight">TravelOS</span>
        </div>
        <div className="px-4 pb-2 text-[9px] font-medium uppercase tracking-[0.14em]" style={{ color: t.sidebar.muted }}>
          Atlas Voyages
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map((n, i) => {
            const active = i === 0;
            const Icon = n.icon;
            return (
              <span
                key={n.label}
                className="flex items-center gap-2.5 px-2.5 py-[7px] text-[11.5px] font-medium"
                style={{
                  background: active ? t.sidebar.active : "transparent",
                  color: active ? t.sidebar.activeText : t.sidebar.muted,
                  borderRadius: pill ? 999 : rs,
                }}
              >
                <Icon className="size-3.5" strokeWidth={2} />
                {n.label}
                {n.label === "Bookings" && (
                  <span
                    className="ml-auto px-1.5 text-[9px] font-semibold"
                    style={{
                      background: tint(t.accent, 22),
                      color: active ? t.sidebar.activeText : t.sidebar.text,
                      borderRadius: 999,
                    }}
                  >
                    12
                  </span>
                )}
              </span>
            );
          })}
        </nav>
        <div
          className="m-3 mt-auto p-3 text-[10px]"
          style={{
            background: gradientCss(heroGrad),
            color: heroGrad.ink,
            borderRadius: pill ? 16 : rs + 2,
          }}
        >
          <div className="font-semibold">Peak season</div>
          <div className="mt-0.5 opacity-80">Dec departures 86% sold</div>
          <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: tint(heroGrad.ink, 25) }}>
            <div className="h-full rounded-full" style={{ width: "86%", background: heroGrad.ink }} />
          </div>
        </div>
      </aside>

      {/* Icon rail (narrow containers) */}
      <aside
        className="hidden w-[46px] shrink-0 flex-col items-center gap-1 py-3 @[380px]:flex @[640px]:hidden"
        style={{
          background: sidebarBg,
          borderRight: `1px solid ${glass ? tint(t.sidebar.border, 60) : t.sidebar.border}`,
        }}
      >
        <span
          className="mb-2 grid size-7 place-items-center"
          style={{ background: gradientCss(sheen), color: sheen.ink, borderRadius: pill ? 999 : rs }}
        >
          <Plane className="size-3.5" strokeWidth={2.4} />
        </span>
        {NAV.map((n, i) => {
          const Icon = n.icon;
          return (
            <span
              key={n.label}
              title={n.label}
              className="grid size-7 place-items-center"
              style={{
                background: i === 0 ? t.sidebar.active : "transparent",
                color: i === 0 ? t.sidebar.activeText : t.sidebar.muted,
                borderRadius: pill ? 999 : rs,
              }}
            >
              <Icon className="size-3.5" />
            </span>
          );
        })}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          className="flex h-12 items-center gap-2 px-3 @[640px]:px-4"
          style={{ borderBottom: `1px solid ${glass ? tint(t.border, 60) : t.border}` }}
        >
          <div
            className="flex h-7 min-w-0 flex-1 items-center gap-2 px-2.5 text-[11px] @[640px]:max-w-[300px]"
            style={{
              background: glass ? t.surface : t.background,
              border: `1px solid ${t.border}`,
              borderRadius: pill ? 999 : rs,
              color: t.textMuted,
            }}
          >
            <Search className="size-3 shrink-0" />
            <span className="truncate">Search trips, bookings, customers…</span>
            <kbd
              className="ml-auto hidden px-1 text-[9px] @[480px]:inline"
              style={{ border: `1px solid ${t.border}`, borderRadius: 4 }}
            >
              ⌘K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className="relative grid size-7 place-items-center"
              style={{
                background: glass ? t.surface : "transparent",
                border: `1px solid ${t.border}`,
                borderRadius: 999,
                color: t.textMuted,
              }}
            >
              <Bell className="size-3.5" />
              <span className="absolute right-1 top-1 size-1.5 rounded-full" style={{ background: t.accent }} />
            </span>
            <span
              className="grid size-7 place-items-center text-[10px] font-semibold"
              style={{ background: gradientCss(sheen), color: sheen.ink, borderRadius: 999 }}
            >
              LH
            </span>
          </div>
        </header>

        <main className="flex flex-col gap-3 p-3 @[640px]:p-4">
          {/* Title row */}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[15px]" style={headingStyle}>
                Good morning, Lina
              </div>
              <div className="text-[11px]" style={{ color: t.textMuted }}>
                Sunday, 22 November · 6 departures this week
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="hidden items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium @[520px]:inline-flex"
                style={{ color: t.textMuted, borderRadius: pill ? 999 : rs }}
              >
                <Download className="size-3" /> Export
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium"
                style={{
                  background: glass ? t.secondary : tint(t.secondary, 10),
                  color: glass ? t.background : t.secondary,
                  border: glass ? "none" : `1px solid ${tint(t.secondary, 22)}`,
                  borderRadius: pill ? 999 : rs,
                }}
              >
                <UserPlus className="size-3" /> Add customer
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold"
                style={{
                  background: t.primary,
                  color: t.primaryFg,
                  borderRadius: pill ? 999 : rs,
                  boxShadow: `0 1px 2px ${tint(t.primary, 30)}, inset 0 1px 0 ${tint("#FFFFFF", 18)}`,
                }}
              >
                <Plus className="size-3" /> New booking
              </button>
            </div>
          </div>

          {/* Hero banner */}
          <div
            className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden px-4 py-3"
            style={{ background: gradientCss(heroGrad), color: heroGrad.ink, borderRadius: r }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full"
              style={{ background: tint(heroGrad.ink, 10) }}
            />
            <div className="relative flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full" style={{ background: tint(heroGrad.ink, 16) }}>
                <CalendarClock className="size-4" />
              </span>
              <div>
                <div className="text-[9.5px] font-medium uppercase tracking-[0.16em] opacity-75">Next departure · 14 Dec</div>
                <div className="text-[13px] font-semibold">Cappadocia Balloon Escape</div>
              </div>
            </div>
            <div className="relative flex min-w-[140px] flex-1 flex-col gap-1 @[520px]:max-w-[220px]">
              <div className="flex justify-between text-[10px] opacity-85">
                <span>18 / 24 seats sold</span>
                <span>75%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: tint(heroGrad.ink, 22) }}>
                <div className="h-full rounded-full" style={{ width: "75%", background: heroGrad.ink }} />
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2.5 @[760px]:grid-cols-4">
            {KPIS.map((k) => {
              const Icon = KPI_ICONS[k.key];
              const c = k.up ? t.success : t.warning;
              return (
                <div key={k.key} className="flex flex-col gap-2 p-3" style={card}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-medium" style={{ color: t.textMuted }}>
                      {k.label}
                    </span>
                    <span
                      className="grid size-6 place-items-center"
                      style={{ background: tint(t.accent, 16), color: mix(t.accent, t.text, 70), borderRadius: pill ? 999 : rs }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                  </div>
                  <div className="text-[18px] font-semibold tracking-tight tabular-nums">{k.value}</div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap px-1 py-px font-semibold"
                      style={{ background: tint(c, 14), color: mix(c, t.text, 72), borderRadius: 4 }}
                    >
                      {k.up ? <ArrowUpRight className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                      {k.delta}
                    </span>
                    <span className="truncate" style={{ color: t.textMuted }}>
                      {k.note}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart + table */}
          <div className="grid gap-2.5 @[900px]:grid-cols-5">
            <div className="flex flex-col p-3 @[900px]:col-span-2" style={card}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12px]" style={headingStyle}>
                  Bookings by product
                </span>
                <span className="text-[10px]" style={{ color: t.textMuted }}>
                  Jul – Dec
                </span>
              </div>
              <div className="h-[168px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 168 }}>
                  <ComposedChart data={BOOKINGS_BY_MONTH} margin={{ top: 6, right: 4, left: -22, bottom: 0 }} barCategoryGap="26%">
                    <CartesianGrid vertical={false} stroke={t.border} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: t.textMuted, fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: t.textMuted, fontSize: 10 }} width={44} />
                    <Tooltip
                      cursor={{ fill: tint(t.text, 5) }}
                      contentStyle={{
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        borderRadius: 8,
                        fontSize: 11,
                        color: t.text,
                      }}
                      labelStyle={{ color: t.text, fontWeight: 600 }}
                      itemStyle={{ color: t.text }}
                    />
                    {SERIES.map((s, i) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        stackId="a"
                        fill={t.chart[i]}
                        radius={i === SERIES.length - 1 ? [3, 3, 0, 0] : 0}
                      />
                    ))}
                    {t.chart[5] && (
                      <Line
                        type="monotone"
                        dataKey="target"
                        name="Target"
                        stroke={t.chart[5]}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {SERIES.map((s, i) => (
                  <span key={s.key} className="inline-flex items-center gap-1 text-[9.5px]" style={{ color: t.textMuted }}>
                    <span className="size-2 rounded-[2px]" style={{ background: t.chart[i] }} />
                    {s.label}
                  </span>
                ))}
                {t.chart[5] && (
                  <span className="inline-flex items-center gap-1 text-[9.5px]" style={{ color: t.textMuted }}>
                    <span className="h-0.5 w-3" style={{ background: t.chart[5] }} />
                    Target
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col @[900px]:col-span-3" style={card}>
              <div className="flex items-center justify-between px-3 pb-2 pt-3">
                <span className="text-[12px]" style={headingStyle}>
                  Recent bookings
                </span>
                <span className="text-[10px] font-medium" style={{ color: mix(t.primary, t.text, 80) }}>
                  View all
                </span>
              </div>
              <table className="w-full text-left text-[10.5px]">
                <thead>
                  <tr style={{ color: t.textMuted, background: tint(t.text, 3) }}>
                    <th className="px-3 py-1.5 font-medium">Booking</th>
                    <th className="hidden px-2 py-1.5 font-medium @[560px]:table-cell">Trip</th>
                    <th className="px-2 py-1.5 text-right font-medium">Total</th>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="hidden px-3 py-1.5 font-medium @[460px]:table-cell">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {BOOKINGS.map((b) => (
                    <tr key={b.ref} style={{ borderTop: `1px solid ${t.border}` }}>
                      <td className="px-3 py-1.5">
                        <div className="font-medium">{b.customer}</div>
                        <div className="text-[9.5px]" style={{ color: t.textMuted }}>
                          {b.ref} · {b.pax} pax
                        </div>
                      </td>
                      <td className="hidden max-w-[150px] truncate px-2 py-1.5 @[560px]:table-cell" style={{ color: t.textMuted }}>
                        {b.trip}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{b.total}</td>
                      <td className="px-2 py-1.5">
                        <Badge t={t} label={b.status} pill={pill} />
                      </td>
                      <td className="hidden px-3 py-1.5 @[460px]:table-cell">
                        <Badge t={t} label={b.payment} pill={pill} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  if (!glass) return shell;
  return (
    <div className="w-full p-3 sm:p-4" style={{ background: glass.canvas, borderRadius: 20 }}>
      {shell}
    </div>
  );
}
